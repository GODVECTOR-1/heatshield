"""Saturday go/no-go heat check (spec 08, Z1). Plain Python, no deps.

Usage: python docs/analysis/heat_check.py <open-meteo-archive.json> <out_dir>
Fetch (Abu Dhabi 24.45, 54.38), timezone=GMT, unixtime, wind m/s:
  https://archive-api.open-meteo.com/v1/archive?latitude=24.45&longitude=54.38
  &start_date=2026-04-01&end_date=2026-11-07&wind_speed_unit=ms&timeformat=unixtime&timezone=GMT
  &hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation_instant,
  direct_radiation_instant,diffuse_radiation_instant,direct_normal_irradiance_instant,
  surface_pressure,wet_bulb_temperature_2m
"""
import csv, json, math, sys
from datetime import datetime, timedelta, timezone

SITE = timezone(timedelta(hours=4))          # Asia/Dubai, no DST
SIGMA = 5.67e-8
SHIFT = (6 * 60, 18 * 60)                    # assumed 06:00-18:00 site time
BAN = (12 * 60 + 30, 15 * 60)                # 12:30-15:00, 15 Jun-15 Sep
B1_THRESHOLDS = (28.2, 30.0, 32.0)           # 28.2 = REL(300 W); B1 is tuned on seed 7 later
K_GRID = (0.05, 0.1, 0.15, 0.2, 0.3)
M = {'moderate': 300, 'heavy': 415}
# (ramp%, clothing adj degC). new_d1_dlw = E1 replay profile: day-1 new, double-layer woven +3
PROFILES = {'new_d1': (0.2, 0), 'ret_d1': (0.5, 0), 'acclim': (1.0, 0), 'new_d1_dlw': (0.2, 3)}
BANDS = (75, 50, 30, 15)                     # L1..L4 entry points (budget below)
PATTERNS = ('continuous', '45/15')           # 45/15 = 45 min work, 15 min shade rest (planner-like)


def stull(t, rh):
    return (t * math.atan(0.151977 * (rh + 8.313659) ** 0.5) + math.atan(t + rh)
            - math.atan(rh - 1.676331) + 0.00391838 * rh ** 1.5 * math.atan(0.023101 * rh) - 4.686035)


def globe_dimiceli(ta, rh, u2, dni, diffuse):
    """Dimiceli et al. 2011 closed form, as in pywbgt/dimiceli.py: temps in degC, wind in m/h,
    h = 0.315, emissivity 0.575*e_a^(1/7) with e_a in hPa. S*fdb/(4*sigma*cosz) == DNI/(4*sigma)."""
    ea = rh / 100 * 6.112 * math.exp(17.67 * ta / (ta + 243.5))
    b = dni / (4 * SIGMA) + 1.2 * diffuse / SIGMA + 0.575 * ea ** (1 / 7) * ta ** 4
    c = 0.315 * (u2 * 3600) ** 0.58 / 5.3865e-8
    return (b + c * ta + 7.68e6) / (c + 2.56e5)


def limit(m, ramp):
    ral = 59.9 - 14.1 * math.log10(m)
    rel = 56.7 - 11.5 * math.log10(m)
    return ral + ramp * (rel - ral)


def level(b):
    return sum(b < x for x in BANDS)


def hhmm(minute):
    return '' if minute is None else f'{minute // 60:02d}:{minute % 60:02d}'


def main(src, out):
    h = json.load(open(src))['hourly']
    hourly, by_hour = [], {}
    for i, t in enumerate(h['time']):
        st = datetime.fromtimestamp(t, SITE)
        ta, rh = h['temperature_2m'][i], h['relative_humidity_2m'][i]
        u2 = max(0.5, 0.75 * h['wind_speed_10m'][i])
        tw = h['wet_bulb_temperature_2m'][i]
        tg = globe_dimiceli(ta, rh, u2, h['direct_normal_irradiance_instant'][i], h['diffuse_radiation_instant'][i])
        tg0 = globe_dimiceli(ta, rh, u2, 0, 0)
        row = dict(site_date=st.date().isoformat(), site_hour=st.hour, ta=ta, rh=rh, u2=round(u2, 2),
                   sw=h['shortwave_radiation_instant'][i], dni=h['direct_normal_irradiance_instant'][i],
                   diffuse=h['diffuse_radiation_instant'][i], tw_om=tw, tw_stull=round(stull(ta, rh), 2),
                   tg_sun=round(tg, 2), wbgt_sun=round(0.7 * tw + 0.2 * tg + 0.1 * ta, 2),
                   wbgt_shade=round(0.7 * tw + 0.2 * tg0 + 0.1 * ta, 2))
        hourly.append(row)
        by_hour[(row['site_date'], st.hour)] = row
    write(f'{out}/hourly.csv', hourly)

    dates = sorted({r['site_date'] for r in hourly})
    daily, budget = [], []
    for d in dates:
        if not all((d, hr) in by_hour for hr in range(6, 19)):
            continue
        sun = [interp(by_hour, d, m, 'wbgt_sun') for m in range(SHIFT[1] - SHIFT[0])]
        md = d[5:]
        ban_season = '06-15' <= md <= '09-15'
        drow = dict(date=d, ban_season=ban_season, wbgt_sun_max=round(max(sun), 1),
                    wbgt_sun_shift_mean=round(sum(sun) / len(sun), 1),
                    wbgt_shade_max=max(by_hour[(d, hr)]['wbgt_shade'] for hr in range(6, 19)))
        for th in B1_THRESHOLDS:
            on = [x >= th for x in sun]
            drow[f'b1_{th}_on_frac'] = round(sum(on) / len(on), 2)
            drow[f'b1_{th}_first_on'] = hhmm(SHIFT[0] + on.index(True)) if any(on) else ''
            drow[f'b1_{th}_switches'] = sum(a != b for a, b in zip(on, on[1:]))
        for cls, w in M.items():
            for p, (ramp, clo) in PROFILES.items():
                lim = limit(w, ramp)
                eff = [x + clo for x in sun]          # effective WBGT
                deltas = [x - lim for x in eff]
                drow[f'{p}_{cls}_max_delta'] = round(max(deltas), 1)
                drow[f'{p}_{cls}_min_over'] = sum(x > 0 for x in deltas)
                for k in K_GRID:
                    for pat in PATTERNS:
                        budget.append(simulate(d, cls, p, lim, k, eff, ban_season, pat))
        daily.append(drow)
    write(f'{out}/daily.csv', daily)
    write(f'{out}/budget.csv', budget)
    return hourly, daily, budget


def interp(by_hour, d, m, key):
    minute = SHIFT[0] + m
    hr, f = divmod(minute, 60)
    a = by_hour[(d, hr)][key]
    b = by_hour.get((d, hr + 1), by_hour[(d, hr)])[key]
    return a + (b - a) * f / 60


def simulate(d, cls, p, lim, k, sun, ban_season, pat):
    """Work in sun from 06:00, Replay start 100. Midday ban and 45/15 rests = shade rest +2/min."""
    b, first, low = 100.0, {}, 100.0
    for i, w in enumerate(sun):
        minute = SHIFT[0] + i
        if (ban_season and BAN[0] <= minute < BAN[1]) or (pat == '45/15' and i % 60 >= 45):
            b += 2
        else:
            b -= k * max(0.0, w - lim)
            if w / lim < 0.9 and cls != 'heavy':
                b += 0.5
        b = min(100.0, max(0.0, b))
        low = min(low, b)
        lv = level(b)
        for n in range(1, lv + 1):
            first.setdefault(n, minute)
    return dict(date=d, profile=p, task=cls, k=k, pattern=pat, limit=round(lim, 2), min_budget=round(low, 1),
                **{f't_L{n}': hhmm(first.get(n)) for n in range(1, 5)})


def write(path, rows):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        wr = csv.DictWriter(f, fieldnames=list(rows[0]))
        wr.writeheader()
        wr.writerows(rows)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
