package geo

import "math"

const EarthRadiusKm = 6371.0

// HaversineKm distância em linha reta entre dois pontos WGS84.
func HaversineKm(lat1, lon1, lat2, lon2 float64) float64 {
	const deg = math.Pi / 180
	φ1 := lat1 * deg
	φ2 := lat2 * deg
	dφ := (lat2 - lat1) * deg
	dλ := (lon2 - lon1) * deg

	a := math.Sin(dφ/2)*math.Sin(dφ/2) +
		math.Cos(φ1)*math.Cos(φ2)*math.Sin(dλ/2)*math.Sin(dλ/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return EarthRadiusKm * c
}
