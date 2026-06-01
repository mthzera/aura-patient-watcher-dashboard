/** Portuguese tooltip copy for dashboard metrics (pt-BR). */

export const METRIC_TOOLTIPS = {
  return:
    "A unidade registrou resposta à alteração clínica (qualquer valor em Ação AURA diferente de vazio ou “sem retorno”). Conta apenas alertas AURA.",
  noReturn:
    "Alerta AURA em que a unidade não registrou resposta (complemento dos alertas com retorno). Soma com “com retorno” = total de alertas AURA.",
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
    "Alertas AURA com a coluna Desfecho Clínico preenchida (dentre os alertas do recorte, não em todos os registros).",
  alertResponseSuccess:
    "Alertas em que a unidade registrou resposta na Ação AURA (não vazio e não “sem retorno”). Taxa = com retorno ÷ alertas AURA.",
  normalReturn:
    "Alertas AURA com retorno em que o desfecho ou resultado da intervenção indica quadro normal, basal ou estável.",
  dataMissingAuraFlag:
    "Quantidade de registros no recorte em que a coluna “Alertado AURA?” está vazia/indefinida (não entra nem como Sim nem como Não).",
} as const;
