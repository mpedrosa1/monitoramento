package httpapi

import (
	"net/http"
	"strconv"
)

func (a *API) ListAntenasProximas(w http.ResponseWriter, r *http.Request) {
	if a.Antenas == nil {
		writeError(w, http.StatusServiceUnavailable, "base de antenas indisponível (configure ANTENAS_DB_PATH)")
		return
	}

	lat, err := strconv.ParseFloat(r.URL.Query().Get("lat"), 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "parâmetro lat inválido")
		return
	}
	lng, err := strconv.ParseFloat(r.URL.Query().Get("lng"), 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "parâmetro lng inválido")
		return
	}
	if lat < -90 || lat > 90 || lng < -180 || lng > 180 {
		writeError(w, http.StatusBadRequest, "coordenadas fora do intervalo válido")
		return
	}

	raioKm := 10.0
	if q := r.URL.Query().Get("raio_km"); q != "" {
		if v, err := strconv.ParseFloat(q, 64); err == nil && v > 0 {
			raioKm = v
		}
	}
	if raioKm > 20 {
		raioKm = 20
	}

	list, err := a.Antenas.ListProximas(r.Context(), lat, lng, raioKm)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSONList(w, http.StatusOK, list)
}
