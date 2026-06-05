package httpapi

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/mmrtec/monitoramento/api/internal/config"
	"github.com/mmrtec/monitoramento/api/internal/ws"
)

func NewRouter(cfg config.Config, api *API, hub *ws.Hub) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(CORSMiddleware(cfg.CORSOrigins))

	r.Get("/health", api.Health)
	r.Get("/ws", hub.ServeHTTP)

	r.Route("/api/v1", func(r chi.Router) {
		r.Use(JSONContentType)
		r.Get("/dashboard/summary", api.DashboardSummary)
		r.Get("/monitoring/live", api.MonitoringLive)
		r.Get("/eventos", api.ListEventos)

		r.Route("/chamados", func(r chi.Router) {
			r.Get("/", api.ListChamados)
			r.Post("/", api.CreateChamado)
			r.Get("/{id}", func(w http.ResponseWriter, req *http.Request) {
				api.GetChamado(w, req, chi.URLParam(req, "id"))
			})
			r.Put("/{id}", func(w http.ResponseWriter, req *http.Request) {
				api.UpdateChamado(w, req, chi.URLParam(req, "id"))
			})
		})

		r.Route("/unidades", func(r chi.Router) {
			r.Get("/", api.ListUnidades)
			r.Post("/", api.CreateUnidade)
			r.Route("/{id}", func(r chi.Router) {
				r.Put("/", func(w http.ResponseWriter, req *http.Request) {
					api.UpdateUnidade(w, req, chi.URLParam(req, "id"))
				})
				r.Delete("/", func(w http.ResponseWriter, req *http.Request) {
					api.DeleteUnidade(w, req, chi.URLParam(req, "id"))
				})
			})
		})

		r.Route("/colaboradores", func(r chi.Router) {
			r.Get("/", api.ListColaboradores)
			r.Post("/", api.CreateColaborador)
			r.Put("/{id}", func(w http.ResponseWriter, req *http.Request) {
				api.UpdateColaborador(w, req, chi.URLParam(req, "id"))
			})
		})

		r.Route("/equipamentos", func(r chi.Router) {
			r.Get("/", api.ListEquipamentos)
			r.Post("/", api.CreateEquipamento)
			r.Route("/{id}", func(r chi.Router) {
				r.Put("/", func(w http.ResponseWriter, req *http.Request) {
					api.UpdateEquipamento(w, req, chi.URLParam(req, "id"))
				})
				r.Delete("/", func(w http.ResponseWriter, req *http.Request) {
					api.DeleteEquipamento(w, req, chi.URLParam(req, "id"))
				})
			})
		})
	})

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"service":"mmrtec-monitoramento-api"}`))
	})

	return r
}
