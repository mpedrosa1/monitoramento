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

	r.Use(CORSMiddleware(cfg.CORSOrigins, cfg.CORSAllowLAN))

	r.Get("/health", api.Health)

	r.Get("/ws", api.AuthWebSocket(hub))

	r.Route("/api/v1", func(r chi.Router) {

		r.Use(JSONContentType)

		r.Post("/auth/login", api.Login)

		r.Group(func(r chi.Router) {

			r.Use(api.AuthMiddleware())

			r.Get("/auth/me", api.Me)

			r.Get("/dashboard/summary", api.DashboardSummary)

			r.Get("/monitoring/live", api.MonitoringLive)

			r.Get("/rastreamento/posicoes", api.ListRastreamentoPosicoes)
			r.Get("/rastreamento/status", api.RastreamentoStatus)

			r.Get("/eventos", api.ListEventos)

			r.Get("/notificacoes", api.ListNotificacoes)
			r.Patch("/notificacoes/{id}/lida", func(w http.ResponseWriter, req *http.Request) {
				api.MarcarNotificacaoLida(w, req, chi.URLParam(req, "id"))
			})

			r.Put("/push-token", api.RegisterPushToken)
			r.Delete("/push-token", api.DeletePushToken)

			r.Route("/chamados", func(r chi.Router) {

				r.Get("/", api.ListChamados)

				r.With(RequireCrudChamados).Post("/", api.CreateChamado)

				r.Get("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.GetChamado(w, req, chi.URLParam(req, "id"))

				})

				r.Put("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.UpdateChamado(w, req, chi.URLParam(req, "id"))

				})

				r.With(RequireCrudChamados).Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.DeleteChamado(w, req, chi.URLParam(req, "id"))

				})

			})

			r.Route("/unidades", func(r chi.Router) {

				r.Get("/", api.ListUnidades)

				r.With(RequireCrudUnidades).Post("/", api.CreateUnidade)

				r.Route("/{id}", func(r chi.Router) {

					r.With(RequireCrudUnidades).Put("/", func(w http.ResponseWriter, req *http.Request) {

						api.UpdateUnidade(w, req, chi.URLParam(req, "id"))

					})

					r.With(RequireCrudUnidades).Delete("/", func(w http.ResponseWriter, req *http.Request) {

						api.DeleteUnidade(w, req, chi.URLParam(req, "id"))

					})

				})

			})

			r.Route("/colaboradores", func(r chi.Router) {

				r.Get("/", api.ListColaboradores)

				r.Get("/me", api.GetColaboradorMe)

				r.With(RequireCrudColaboradores).Post("/", api.CreateColaborador)

				r.Route("/{id}", func(r chi.Router) {

					r.With(RequireCrudColaboradores).Put("/", func(w http.ResponseWriter, req *http.Request) {

						api.UpdateColaborador(w, req, chi.URLParam(req, "id"))

					})

					r.With(RequireCrudColaboradores).Delete("/", func(w http.ResponseWriter, req *http.Request) {

						api.DeleteColaborador(w, req, chi.URLParam(req, "id"))

					})

				})

			})

			r.Route("/escalas", func(r chi.Router) {

				r.Use(RequireAccessRH)

				r.Get("/", api.ListEscalas)

				r.With(RequireRhEscalaTrabalho).Post("/", api.CreateEscala)

				r.With(RequireRhEscalaTrabalho).Put("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.UpdateEscala(w, req, chi.URLParam(req, "id"))

				})

				r.With(RequireRhEscalaTrabalho).Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.DeleteEscala(w, req, chi.URLParam(req, "id"))

				})

			})

			r.Get("/sobreavisos/me/escalado", api.GetSobreavisoMeEscalado)

			r.Get("/sobreavisos/calendario", api.GetSobreavisoCalendario)

			r.Route("/sobreavisos", func(r chi.Router) {

				r.Use(RequireAccessRH)

				r.Get("/", api.ListSobreavisos)

				r.Get("/definicoes", api.ListDefinicoesSobreaviso)

				r.With(RequireRhCalendarioSobreaviso).Post("/definir", api.DefinirSobreaviso)

				r.With(RequireRhCalendarioSobreaviso).Post("/", api.CreateSobreaviso)

				r.With(RequireRhCalendarioSobreaviso).Put("/{id}", func(w http.ResponseWriter, req *http.Request) {

					api.UpdateSobreaviso(w, req, chi.URLParam(req, "id"))

				})

				r.With(RequireRhCalendarioSobreaviso).Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {

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

			r.Route("/alertas-equipamento", func(r chi.Router) {

				r.Use(RequireEquipAlarmes)

				r.Get("/", api.ListAlertasEquipamento)

				r.Post("/", api.CreateAlertaEquipamento)

				r.Put("/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.UpdateAlertaEquipamento(w, req, chi.URLParam(req, "id"))
				})

				r.Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.DeleteAlertaEquipamento(w, req, chi.URLParam(req, "id"))
				})

			})

			r.Route("/convenio-medico/faixas", func(r chi.Router) {

				r.With(RequireVerFaixasConvenio).Get("/", api.ListFaixasConvenioMedico)

				r.With(RequireRhConvenioMedico).Post("/", api.CreateFaixaConvenioMedico)

				r.With(RequireRhConvenioMedico).Put("/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.UpdateFaixaConvenioMedico(w, req, chi.URLParam(req, "id"))
				})

				r.With(RequireRhConvenioMedico).Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.DeleteFaixaConvenioMedico(w, req, chi.URLParam(req, "id"))
				})

			})

			r.Get("/antenas/proximas", api.ListAntenasProximas)

			r.Route("/veiculos", func(r chi.Router) {
				r.Get("/", api.ListVeiculos)
				r.Post("/condutor-divergencias/verificar", api.VerificarCondutoresRotaExata)
				r.Get("/condutor-divergencias", api.ListCondutorRotaExataDivergencias)
				r.With(RequireFrotaTrocarVeiculos).Post("/condutor-divergencias/{id}/aprovar", func(w http.ResponseWriter, req *http.Request) {
					api.AprovarCondutorRotaExataDivergencia(w, req, chi.URLParam(req, "id"))
				})
				r.With(RequireFrotaTrocarVeiculos).Post("/condutor-divergencias/{id}/recusar", func(w http.ResponseWriter, req *http.Request) {
					api.RecusarCondutorRotaExataDivergencia(w, req, chi.URLParam(req, "id"))
				})
				r.Post("/trocas/solicitar", api.SolicitarTrocaVeiculo)
				r.Post("/trocas/{id}/responder", func(w http.ResponseWriter, req *http.Request) {
					api.ResponderTrocaVeiculo(w, req, chi.URLParam(req, "id"))
				})
				r.With(RequireFrotaTrocarVeiculos).Post("/trocas/admin", api.TrocaAdminVeiculos)
				r.Get("/{id}/periodos-motorista", func(w http.ResponseWriter, req *http.Request) {
					api.ListVeiculoPeriodosMotorista(w, req, chi.URLParam(req, "id"))
				})
				r.With(RequireFrotaRegistrarPeriodo).Post("/{id}/periodos-motorista", func(w http.ResponseWriter, req *http.Request) {
					api.CreateVeiculoPeriodoMotorista(w, req, chi.URLParam(req, "id"))
				})
				r.With(RequireFrotaRegistrarPeriodo).Put("/{id}/periodos-motorista/{periodoId}", func(w http.ResponseWriter, req *http.Request) {
					api.UpdateVeiculoPeriodoMotorista(w, req, chi.URLParam(req, "id"), chi.URLParam(req, "periodoId"))
				})
				r.With(RequireFrotaRegistrarPeriodo).Delete("/{id}/periodos-motorista/{periodoId}", func(w http.ResponseWriter, req *http.Request) {
					api.DeleteVeiculoPeriodoMotorista(w, req, chi.URLParam(req, "id"), chi.URLParam(req, "periodoId"))
				})
				r.Get("/{id}/multas", func(w http.ResponseWriter, req *http.Request) {
					api.ListVeiculoMultas(w, req, chi.URLParam(req, "id"))
				})
				r.With(RequireFrotaRegistrarMulta).Post("/{id}/multas", func(w http.ResponseWriter, req *http.Request) {
					api.CreateVeiculoMulta(w, req, chi.URLParam(req, "id"))
				})
				r.With(RequireFrotaRegistrarMulta).Put("/{id}/multas/{multaId}", func(w http.ResponseWriter, req *http.Request) {
					api.UpdateVeiculoMulta(w, req, chi.URLParam(req, "id"), chi.URLParam(req, "multaId"))
				})
				r.With(RequireFrotaRegistrarMulta).Delete("/{id}/multas/{multaId}", func(w http.ResponseWriter, req *http.Request) {
					api.DeleteVeiculoMulta(w, req, chi.URLParam(req, "id"), chi.URLParam(req, "multaId"))
				})
				r.With(RequireCrudVeiculos).Post("/", api.CreateVeiculo)
				r.With(RequireCrudVeiculos).Put("/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.UpdateVeiculo(w, req, chi.URLParam(req, "id"))
				})
				r.With(RequireCrudVeiculos).Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.DeleteVeiculo(w, req, chi.URLParam(req, "id"))
				})
			})

			r.Route("/equipamentos", func(r chi.Router) {

				r.Get("/", api.ListEquipamentos)

				r.With(RequireCrudEquipamentos).Post("/snmp/test-oid", api.TestSnmpOID)

				r.With(RequireCrudEquipamentos).Post("/modbus/test-offset", api.TestModbusOffset)

				r.With(RequireCrudEquipamentos).Post("/", api.CreateEquipamento)

				r.Route("/{id}", func(r chi.Router) {

					r.With(RequireCrudEquipamentos).Put("/", func(w http.ResponseWriter, req *http.Request) {

						api.UpdateEquipamento(w, req, chi.URLParam(req, "id"))

					})

					r.With(RequireCrudEquipamentos).Delete("/", func(w http.ResponseWriter, req *http.Request) {

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
				r.With(RequireRhRegistrarDespesaOutros).Post("/colaboradores/{colaboradorId}", func(w http.ResponseWriter, req *http.Request) {
					api.CreateDespesaColaborador(w, req, chi.URLParam(req, "colaboradorId"))
				})
				r.With(RequireRhRegistrarDespesaOutros).Put("/colaboradores/{colaboradorId}/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.UpdateDespesaColaborador(w, req, chi.URLParam(req, "colaboradorId"), chi.URLParam(req, "id"))
				})
				r.With(RequireRhRegistrarDespesaOutros).Delete("/colaboradores/{colaboradorId}/{id}", func(w http.ResponseWriter, req *http.Request) {
					api.DeleteDespesaColaborador(w, req, chi.URLParam(req, "colaboradorId"), chi.URLParam(req, "id"))
				})
				r.With(RequireRhRegistrarDespesaOutros).Get("/colaboradores/{colaboradorId}", func(w http.ResponseWriter, req *http.Request) {
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
