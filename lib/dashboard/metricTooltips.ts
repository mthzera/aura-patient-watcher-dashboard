/** Portuguese tooltip copy for dashboard metrics (pt-BR). */

export const METRIC_TOOLTIPS = {
  return:
    "A unidade registrou resposta à alteração clínica (qualquer valor em Ação AURA diferente de vazio ou “sem retorno”). Conta apenas alertas AURA.",
  noReturn:
    "Registro sem resposta da unidade: Ação AURA vazia ou contendo “sem retorno”. Pode ser exibido no total de registros ou só entre alertas AURA — o denominador aparece ao lado da porcentagem.",
  effectiveness:
    "Entre os casos com atuação documentada e desfecho clínico registrado, percentual que evoluiu com desfecho favorável (melhora, condição basal ou estabilização).",
  alertResponseRate:
    "Alertas com retorno ÷ alertas AURA × 100. Mede quantos alertas receberam qualquer resposta da unidade.",
  funnelRecords:
    "Total de linhas no recorte filtrado da planilha.",
  funnelAuraAlerts:
    'Registros com coluna “Alertado AURA?” = Sim.',
  funnelAlertsWithReturn:
    "Alertas AURA em que a unidade registrou resposta (não é “sem retorno”).",
  funnelAlertsNoReturn:
    "Alertas AURA sem resposta registrada na coluna Ação AURA.",
  funnelUnitActions:
    "Registros com atuação concreta documentada (reavaliação, intervenção, notificação etc.), excluindo “sem retorno”.",
  funnelOutcomes:
    "Registros com desfecho clínico preenchido na planilha.",
  normalReturn:
    "Alertas AURA com retorno em que o desfecho ou resultado da intervenção indica quadro normal, basal ou estável.",
} as const;
