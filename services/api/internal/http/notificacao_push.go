package httpapi

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/mmrtec/monitoramento/api/internal/domain"
	"github.com/mmrtec/monitoramento/api/internal/push"
	"github.com/mmrtec/monitoramento/api/internal/ws"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func (a *API) pushNotificacao(n domain.Notificacao) {
	if a.Hub != nil {
		a.Hub.NotifyColaborador(n.DestinatarioColaboradorID.Hex(), ws.Message{
			Type:    "notification",
			Payload: n,
		})
	}
	go a.sendMobilePushNotificacao(n)
}

func (a *API) sendMobilePushNotificacao(n domain.Notificacao) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	tokens, err := a.Store.ListPushTokens(ctx, n.DestinatarioColaboradorID)
	if err != nil {
		log.Printf("push mobile: listar tokens: %v", err)
		return
	}
	if len(tokens) == 0 {
		return
	}

	push.SendMobile(ctx, tokens, n.Titulo, n.Mensagem, notificacaoPushData(n))
}

func notificacaoPushData(n domain.Notificacao) map[string]string {
	data := map[string]string{
		"notificacaoId": n.ID.Hex(),
		"tipo":          string(n.Tipo),
	}
	if n.Payload.TrocaID != "" {
		data["trocaId"] = n.Payload.TrocaID
	}
	if n.Payload.ChamadoID != "" {
		data["chamadoId"] = n.Payload.ChamadoID
	}
	if n.Payload.MissaoID != "" {
		data["missaoId"] = n.Payload.MissaoID
	}
	if n.Payload.UnidadeID != "" {
		data["unidadeId"] = n.Payload.UnidadeID
	}
	return data
}

func (a *API) criarENotificar(ctx context.Context, notif domain.Notificacao) {
	if err := a.Store.CreateNotificacao(ctx, &notif); err != nil {
		log.Printf("notificação %s: criar: %v", notif.Tipo, err)
		return
	}
	a.pushNotificacao(notif)
}

func (a *API) notificarChamadoAberto(c domain.Chamado) {
	if c.Status != domain.ChamadoAberto {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		unidadeNome := ""
		if !c.UnidadeID.IsZero() {
			if u, err := a.Store.GetUnidade(ctx, c.UnidadeID); err == nil {
				unidadeNome = u.Nome
			}
		}

		titulo := "Novo chamado aberto"
		msg := strings.TrimSpace(c.Titulo)
		if msg == "" {
			msg = "Chamado sem título"
		}
		if unidadeNome != "" {
			msg = unidadeNome + ": " + msg
		}
		if c.Numero != "" {
			msg = "#" + c.Numero + " — " + msg
		}

		payload := domain.NotificacaoPayload{
			ChamadoID:     c.ID.Hex(),
			ChamadoNumero: c.Numero,
			UnidadeID:     c.UnidadeID.Hex(),
		}

		colabs, err := a.Store.ListColaboradores(ctx)
		if err != nil {
			log.Printf("notificar chamado: listar colaboradores: %v", err)
			return
		}

		for _, colab := range colabs {
			a.criarENotificar(ctx, domain.Notificacao{
				DestinatarioColaboradorID: colab.ID,
				Tipo:                      domain.NotificacaoChamadoAberto,
				Titulo:                    titulo,
				Mensagem:                  msg,
				Payload:                   payload,
			})
		}
	}()
}

func (a *API) notificarMissaoAgendada(m domain.Missao) {
	if m.Status != domain.MissaoPlanejada || len(m.ColaboradorIDs) == 0 {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		unidadeNome := ""
		if !m.UnidadeID.IsZero() {
			if u, err := a.Store.GetUnidade(ctx, m.UnidadeID); err == nil {
				unidadeNome = u.Nome
			}
		}

		titulo := "Missão agendada"
		msg := strings.TrimSpace(m.Titulo)
		if msg == "" {
			msg = "Missão sem título"
		}
		if unidadeNome != "" {
			msg = unidadeNome + ": " + msg
		}
		if m.DataInicio != "" || m.HoraInicio != "" {
			agenda := strings.TrimSpace(strings.Join([]string{m.DataInicio, m.HoraInicio}, " "))
			if agenda != "" {
				msg = fmt.Sprintf("%s (%s)", msg, agenda)
			}
		}

		payload := domain.NotificacaoPayload{
			MissaoID:   m.ID.Hex(),
			UnidadeID:  m.UnidadeID.Hex(),
			DataInicio: m.DataInicio,
			HoraInicio: m.HoraInicio,
		}
		if !m.ChamadoID.IsZero() {
			payload.ChamadoID = m.ChamadoID.Hex()
		}

		vistos := make(map[primitive.ObjectID]struct{}, len(m.ColaboradorIDs))
		for _, colabID := range m.ColaboradorIDs {
			if colabID.IsZero() {
				continue
			}
			if _, ok := vistos[colabID]; ok {
				continue
			}
			vistos[colabID] = struct{}{}

			a.criarENotificar(ctx, domain.Notificacao{
				DestinatarioColaboradorID: colabID,
				Tipo:                      domain.NotificacaoMissaoAgendada,
				Titulo:                    titulo,
				Mensagem:                  msg,
				Payload:                   payload,
			})
		}
	}()
}
