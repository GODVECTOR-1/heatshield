"""Writes the bundled weather fixtures (WeatherHour[]) and the 12x24 p95 climatology. Plain Python.

Usage: python docs/analysis/make_fixtures.py <archive-2026.json> <archive-2021-2025.json>
Both are Open-Meteo archive responses with the fetch parameters in heat_check.py
(2026-04-01..2026-11-07 and 2021-01-01..2025-12-31). Outputs go to data/.
"""
import json, math, sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from heat_check import SITE, globe_dimiceli  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
WINDOWS = {  # site-time days, inclusive (spec 08 / 11)
    '2026-07-13_to_18': ('2026-07-13', '2026-07-18'),  # Replay 15 Jul + neighbours
    '2026-05-25_to_29': ('2026-05-25', '2026-05-29'),  # evidence shoulder (B1 at 30)
    '2026-10-08_to_12': ('2026-10-08', '2026-10-12'),  # evidence shoulder (B1 at 28.2)
    '2026-11-07': ('2026-11-07', '2026-11-07'),        # E1 November live
}
SOURCE = 'Open-Meteo archive (CC BY 4.0), Abu Dhabi 24.45N 54.38E'


def rows(path):
    h = json.load(open(path))['hourly']
    for i, t in enumerate(h['time']):
        yield dict(t=t * 1000, ta=h['temperature_2m'][i], rh=h['relative_humidity_2m'][i], u10=h['wind_speed_10m'][i],
                   dni=h['direct_normal_irradiance_instant'][i], diffuse=h['diffuse_radiation_instant'][i],
                   tw=h['wet_bulb_temperature_2m'][i])


def site_day(r):
    return datetime.fromtimestamp(r['t'] / 1000, SITE).date().isoformat()


def wbgt(r, sun):
    u2 = max(0.5, 0.75 * r['u10'])
    tg = globe_dimiceli(r['ta'], r['rh'], u2, r['dni'] if sun else 0, r['diffuse'] if sun else 0)
    return 0.7 * r['tw'] + 0.2 * tg + 0.1 * r['ta']


def p95(xs):
    xs = sorted(xs)
    k = (len(xs) - 1) * 0.95
    lo, hi = math.floor(k), math.ceil(k)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)


def dump(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    if isinstance(obj, list):  # one WeatherHour per line, diff-friendly
        text = '[\n' + ',\n'.join(json.dumps(r, separators=(',', ':')) for r in obj) + '\n]\n'
    else:
        text = json.dumps(obj, indent=1) + '\n'
    path.write_text(text, encoding='utf-8', newline='\n')


def main(src_2026, src_clim):
    recent = list(rows(src_2026))
    for name, (a, b) in WINDOWS.items():
        sel = [r for r in recent if a <= site_day(r) <= b]
        days = (date.fromisoformat(b) - date.fromisoformat(a)).days + 1
        assert len(sel) == 24 * days, (name, len(sel))
        dump(ROOT / 'data/fixtures' / f'{name}.json', sel)

    cells = {'sun': [[[] for _ in range(24)] for _ in range(12)], 'shade': [[[] for _ in range(24)] for _ in range(12)]}
    for r in rows(src_clim):
        st = datetime.fromtimestamp(r['t'] / 1000, SITE)
        for key, sun in (('sun', True), ('shade', False)):
            cells[key][st.month - 1][st.hour].append(wbgt(r, sun))
    clim = {'source': f'{SOURCE}, 2021-2025, p95 WBGT (Dimiceli globe)',
            'sun': [[round(p95(c), 2) for c in m] for m in cells['sun']],
            'shade': [[round(p95(c), 2) for c in m] for m in cells['shade']]}
    dump(ROOT / 'data/climatology.json', clim)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
