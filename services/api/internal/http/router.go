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

	r.Get("/ws", AuthWebSocket(cfg.JWTSecret, hub))



	r.Route("/api/v1", func(r chi.Router) {

		r.Use(JSONContentType)

		r.Post("/auth/login", api.Login)



		r.Group(func(r chi.Router) {

			r.Use(AuthMiddleware(cfg.JWTSecret))

			r.Get("/auth/me", api.Me)

			r.Get("/dashboard/summary", api.DashboardSummary)

			r.Get("/monitoring/live", api.MonitoringLive)

			r.Get("/eventos", api.ListEventos)



			r.Route("/chamados", func(r chi.Router) {

				r.Get("/", api.ListChamados)

				r.With(RequireManageData).Post("/", api.CreateChamado)

				r.Get("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.GetChamado(w, req, chi.URLParam(req, "id"))

				})

				r.Put("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.UpdateChamado(w, req, chi.URLParam(req, "id"))

				})

				r.With(RequireManageData).Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.DeleteChamado(w, req, chi.URLParam(req, "id"))

				})

			})



			r.Route("/unidades", func(r chi.Router) {

				r.Get("/", api.ListUnidades)

				r.With(RequireManageData).Post("/", api.CreateUnidade)

				r.Route("/{id}", func(r chi.Router) {

					r.With(RequireManageData).Put("/", func(w http.ResponseWriter, req *http.Request) {

						api.UpdateUnidade(w, req, chi.URLParam(req, "id"))

					})

					r.With(RequireManageData).Delete("/", func(w http.ResponseWriter, req *http.Request) {

						api.DeleteUnidade(w, req, chi.URLParam(req, "id"))

					})

				})

			})



			r.Route("/colaboradores", func(r chi.Router) {

				r.Get("/", api.ListColaboradores)

				r.With(RequireManageData).Post("/", api.CreateColaborador)

				r.Route("/{id}", func(r chi.Router) {

					r.With(RequireManageData).Put("/", func(w http.ResponseWriter, req *http.Request) {

						api.UpdateColaborador(w, req, chi.URLParam(req, "id"))

					})

					r.With(RequireManageData).Delete("/", func(w http.ResponseWriter, req *http.Request) {

						api.DeleteColaborador(w, req, chi.URLParam(req, "id"))

					})

				})

			})



			r.Route("/missoes", func(r chi.Router) {
				r.Get("/", api.ListMissoes)
				r.With(RequireManageData).Post("/", api.CreateMissao)
				r.Route("/{id}", func(r chi.Router) {
					r.Put("/iniciar", func(w http.ResponseWriter, req *http.Request) {
						api.IniciarMissao(w, req, chi.URLParam(req, "id"))
					})
					r.Put("/concluir", func(w http.ResponseWriter, req *http.Request) {
						api.ConcluirMissao(w, req, chi.URLParam(req, "id"))
					})
					r.With(RequireManageMissoes).Put("/", func(w http.ResponseWriter, req *http.Request) {
						api.UpdateMissao(w, req, chi.URLParam(req, "id"))
					})
					r.With(RequireManageMissoes).Delete("/", func(w http.ResponseWriter, req *http.Request) {
						api.DeleteMissao(w, req, chi.URLParam(req, "id"))
					})
				})
			})



			r.Get("/antenas/proximas", api.ListAntenasProximas)



			r.Route("/equipamentos", func(r chi.Router) {

				r.Get("/", api.ListEquipamentos)

				r.With(RequireManageData).Post("/snmp/test-oid", api.TestSnmpOID)

				r.With(RequireManageData).Post("/", api.CreateEquipamento)

				r.Route("/{id}", func(r chi.Router) {

					r.With(RequireManageData).Put("/", func(w http.ResponseWriter, req *http.Request) {

						api.UpdateEquipamento(w, req, chi.URLParam(req, "id"))

					})

					r.With(RequireManageData).Delete("/", func(w http.ResponseWriter, req *http.Request) {

						api.DeleteEquipamento(w, req, chi.URLParam(req, "id"))

					})

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


