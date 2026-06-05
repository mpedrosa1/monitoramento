package antenas

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

const earthRadiusKm = 6371.0

type Store struct {
	db *sql.DB
}

func Open(path string) (*Store, error) {
	if path == "" {
		return nil, fmt.Errorf("caminho do banco de antenas vazio")
	}
	if _, err := os.Stat(path); err != nil {
		return nil, fmt.Errorf("banco de antenas não encontrado em %s: %w", path, err)
	}

	uri := fmt.Sprintf("file:%s?mode=ro", filepath.ToSlash(path))
	db, err := sql.Open("sqlite", uri)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)

	s := &Store{db: db}
	if err := s.ping(context.Background()); err != nil {
		_ = db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *Store) ping(ctx context.Context) error {
	return s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM antenas LIMIT 1`).Scan(new(int))
}

// ListProximas retorna antenas dentro de radiusKm da coordenada informada.
func (s *Store) ListProximas(ctx context.Context, lat, lng, radiusKm float64) ([]Antena, error) {
	if radiusKm <= 0 {
		radiusKm = 10
	}
	if radiusKm > 20 {
		radiusKm = 20
	}

	latRad := lat * math.Pi / 180
	deltaLat := radiusKm / 111.32
	deltaLng := radiusKm / (111.32 * math.Max(math.Cos(latRad), 0.01))

	minLat := lat - deltaLat
	maxLat := lat + deltaLat
	minLng := lng - deltaLng
	maxLng := lng + deltaLng

	const q = `
SELECT
  id,
  nome_entidade,
  tecnologia,
  latitude,
  longitude,
  azimute,
  potencia_transmissor_watts,
  altura_antena,
  municipio,
  num_estacao,
  (
    ? * acos(
      min(1.0, max(-1.0,
        cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) +
        sin(radians(?)) * sin(radians(latitude))
      ))
    )
  ) AS distancia_km
FROM antenas
WHERE latitude BETWEEN ? AND ?
  AND longitude BETWEEN ? AND ?
  AND (
    ? * acos(
      min(1.0, max(-1.0,
        cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) +
        sin(radians(?)) * sin(radians(latitude))
      ))
    )
  ) <= ?
ORDER BY distancia_km ASC`

	rows, err := s.db.QueryContext(
		ctx, q,
		earthRadiusKm, lat, lng, lat,
		minLat, maxLat, minLng, maxLng,
		earthRadiusKm, lat, lng, lat,
		radiusKm,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Antena, 0, 256)
	for rows.Next() {
		var a Antena
		if err := rows.Scan(
			&a.ID,
			&a.NomeEntidade,
			&a.Tecnologia,
			&a.Latitude,
			&a.Longitude,
			&a.Azimute,
			&a.PotenciaW,
			&a.AlturaAntena,
			&a.Municipio,
			&a.NumEstacao,
			&a.DistanciaKm,
		); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}
