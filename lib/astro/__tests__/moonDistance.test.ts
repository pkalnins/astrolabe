import { describe, expect, it } from "vitest";
import * as Astronomy from "astronomy-engine";
import { getMoonDistance } from "../moonDistance";

describe("getMoonDistance", () => {
  it("agrees with astronomy-engine's own apsis distance at a perigee moment", () => {
    // SearchLunarApsis computes dist_km independently (via a different code
    // path than GeoMoon().Length()) - a good cross-check on our AU->km conversion.
    const apsis = Astronomy.SearchLunarApsis(new Date(Date.UTC(2024, 0, 1)));
    const info = getMoonDistance(apsis.time.date);
    expect(Math.abs(info.distanceKm - apsis.dist_km)).toBeLessThan(50);
  });

  it("classifies a known-close perigee as Close and a known-far apogee as Far", () => {
    let apsis = Astronomy.SearchLunarApsis(new Date(Date.UTC(2024, 0, 1)));
    const seen = new Set<Astronomy.ApsisKind>();
    // Walk a handful of apsides to find at least one perigee and one apogee.
    for (let i = 0; i < 4 && seen.size < 2; i++) {
      const info = getMoonDistance(apsis.time.date);
      if (apsis.kind === Astronomy.ApsisKind.Pericenter) {
        expect(info.category).toBe("Close");
        seen.add(apsis.kind);
      } else {
        expect(info.category).toBe("Far");
        seen.add(apsis.kind);
      }
      apsis = Astronomy.NextLunarApsis(apsis);
    }
    expect(seen.size).toBe(2);
  });

  it("classifies the midpoint between perigee and apogee as Typical", () => {
    const perigee = Astronomy.SearchLunarApsis(new Date(Date.UTC(2024, 0, 1)));
    const apogee = Astronomy.NextLunarApsis(perigee);
    const midpoint = new Date((perigee.time.date.getTime() + apogee.time.date.getTime()) / 2);
    expect(getMoonDistance(midpoint).category).toBe("Typical");
  });
});
