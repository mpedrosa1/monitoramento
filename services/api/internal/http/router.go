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

			r.Get("/notificacoes", api.ListNotificacoes)
			r.Patch("/notificacoes/{id}/lida", func(w http.ResponseWriter, req *http.Request) {
				api.MarcarNotificacaoLida(w, req, chi.URLParam(req, "id"))
			})

			r.Put("/push-token", api.RegisterPushToken)
			r.Delete("/push-token", api.DeletePushToken)

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

				r.Get("/me", api.GetColaboradorMe)

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

			r.Route("/escalas", func(r chi.Router) {

				r.Use(RequireAccessRH)

				r.Get("/", api.ListEscalas)

				r.With(RequireManageData).Post("/", api.CreateEscala)

				r.With(RequireManageData).Put("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.UpdateEscala(w, req, chi.URLParam(req, "id"))

				})

				r.With(RequireManageData).Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.DeleteEscala(w, req, chi.URLParam(req, "id"))

				})

			})

			r.Get("/sobreavisos/me/escalado", api.GetSobreavisoMeEscalado)

			r.Get("/sobreavisos/calendario", api.GetSobreavisoCalendario)

			r.Route("/sobreavisos", func(r chi.Router) {

				r.Use(RequireAccessRH)

				r.Get("/", api.ListSobreavisos)

				r.Get("/definicoes", api.ListDefinicoesSobreaviso)

				r.With(RequireManageData).Post("/definir", api.DefinirSobreaviso)

				r.With(RequireManageData).Post("/", api.CreateSobreaviso)

				r.With(RequireManageData).Put("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.UpdateSobreaviso(w, req, chi.URLParam(req, "id"))

				})

				r.With(RequireManageData).Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.DeleteSobreaviso(w, req, chi.URLParam(req, "id"))

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

			r.Route("/veiculos", func(r chi.Router) {
				r.Get("/", api.ListVeiculos)
				r.Post("/trocas/solicitar", api.SolicitarTrocaVeiculo)
				r.Post("/trocas/{id}/responder", func(w http.ResponseWriter, req *http.Request) {
					api.ResponderTrocaVeiculo(w, req, chi.URLParam(req, "id"))
				})
				r.With(RequireManageData).Post("/trocas/admin", api.TrocaAdminVeiculos)
				r.With(RequireManageData).Post("/", api.CreateVeiculo)
				r.With(RequireManageData).Put("/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.UpdateVeiculo(w, req, chi.URLParam(req, "id"))
				})
				r.With(RequireManageData).Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.DeleteVeiculo(w, req, chi.URLParam(req, "id"))
				})
			})

			r.Route("/equipamentos", func(r chi.Router) {

				r.Get("/", api.ListEquipamentos)

				r.With(RequireManageData).Post("/snmp/test-oid", api.TestSnmpOID)

				r.With(RequireManageData).Post("/modbus/test-offset", api.TestModbusOffset)

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

			r.Route("/despesas", func(r chi.Router) {
				r.Get("/me", api.GetDespesasMe)
				r.Post("/me", api.CreateDespesaMe)
				r.Put("/me/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.UpdateDespesaMe(w, req, chi.URLParam(req, "id"))
				})
				r.Delete("/me/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.DeleteDespesaMe(w, req, chi.URLParam(req, "id"))
				})
				r.With(RequireManageData).Post("/colaboradores/{colaboradorId}", func(w http.ResponseWriter, req *http.Request) {
					api.CreateDespesaColaborador(w, req, chi.URLParam(req, "colaboradorId"))
				})
				r.With(RequireManageData).Put("/colaboradores/{colaboradorId}/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.UpdateDespesaColaborador(w, req, chi.URLParam(req, "colaboradorId"), chi.URLParam(req, "id"))
				})
				r.With(RequireManageData).Delete("/colaboradores/{colaboradorId}/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.DeleteDespesaColaborador(w, req, chi.URLParam(req, "colaboradorId"), chi.URLParam(req, "id"))
				})
				r.With(RequireManageData).Get("/colaboradores/{colaboradorId}", func(w http.ResponseWriter, req *http.Request) {
					api.GetDespesasColaborador(w, req, chi.URLParam(req, "colaboradorId"))
				})
				r.With(RequireAccessRH).Get("/resumo", api.GetDespesasResumoColaboradores)
				r.With(RequireGestaoRecargas).Put("/depositos/{colaboradorId}", func(w http.ResponseWriter, req *http.Request) {
					api.UpsertDepositoDespesa(w, req, chi.URLParam(req, "colaboradorId"))
				})
				r.With(RequireGestaoRecargas).Put("/colaboradores/{colaboradorId}/ajustes-saldo", func(w http.ResponseWriter, req *http.Request) {
					api.UpsertAjusteSaldoDespesa(w, req, chi.URLParam(req, "colaboradorId"))
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
