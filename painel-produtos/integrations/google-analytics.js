const path = require("path");
const { BetaAnalyticsDataClient } = require("@google-analytics/data");

const PROPERTY_ID = "556475757";

const KEY_FILE = path.join(
  __dirname,
  "..",
  "secrets",
  "turkista-commerce-7a7287c048bc.json"
);

const client = new BetaAnalyticsDataClient({
  keyFilename: KEY_FILE,
});

function normalizarPeriodo(periodo) {
  switch (String(periodo || "30")) {
    case "7":
      return "7daysAgo";
    case "30":
      return "30daysAgo";
    case "90":
      return "90daysAgo";
    case "todos":
      return "2020-01-01";
    default:
      return "30daysAgo";
  }
}

function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function valor(row, indice) {
  return numero(row?.metricValues?.[indice]?.value);
}

async function executarRelatorio(config) {
  const [response] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
    ...config,
  });

  return response;
}

async function resumo(periodo = "30") {
  const response = await executarRelatorio({
    dateRanges: [
      {
        startDate: normalizarPeriodo(periodo),
        endDate: "today",
      },
    ],
    metrics: [
      { name: "activeUsers" },
      { name: "sessions" },
      { name: "screenPageViews" },
      { name: "eventCount" },
    ],
  });

  const row = response.rows?.[0];

  return {
    periodo,
    propertyId: PROPERTY_ID,
    activeUsers: valor(row, 0),
    sessions: valor(row, 1),
    screenPageViews: valor(row, 2),
    eventCount: valor(row, 3),
  };
}

async function paginas(periodo = "30", limite = 20) {
  const response = await executarRelatorio({
    dateRanges: [
      {
        startDate: normalizarPeriodo(periodo),
        endDate: "today",
      },
    ],
    dimensions: [
      { name: "pagePath" },
      { name: "pageTitle" },
    ],
    metrics: [
      { name: "screenPageViews" },
      { name: "activeUsers" },
    ],
    orderBys: [
      {
        metric: {
          metricName: "screenPageViews",
        },
        desc: true,
      },
    ],
    limit: limite,
  });

  return (response.rows || []).map((row) => ({
    path: row.dimensionValues?.[0]?.value || "",
    title: row.dimensionValues?.[1]?.value || "",
    views: valor(row, 0),
    users: valor(row, 1),
  }));
}

async function origens(periodo = "30", limite = 15) {
  const response = await executarRelatorio({
    dateRanges: [
      {
        startDate: normalizarPeriodo(periodo),
        endDate: "today",
      },
    ],
    dimensions: [
      { name: "sessionDefaultChannelGroup" },
      { name: "sessionSource" },
      { name: "sessionMedium" },
    ],
    metrics: [
      { name: "sessions" },
      { name: "activeUsers" },
    ],
    orderBys: [
      {
        metric: {
          metricName: "sessions",
        },
        desc: true,
      },
    ],
    limit: limite,
  });

  return (response.rows || []).map((row) => ({
    canal: row.dimensionValues?.[0]?.value || "(not set)",
    origem: row.dimensionValues?.[1]?.value || "(not set)",
    midia: row.dimensionValues?.[2]?.value || "(not set)",
    sessions: valor(row, 0),
    users: valor(row, 1),
  }));
}

async function eventos(periodo = "30", limite = 30) {
  const response = await executarRelatorio({
    dateRanges: [
      {
        startDate: normalizarPeriodo(periodo),
        endDate: "today",
      },
    ],
    dimensions: [
      { name: "eventName" },
    ],
    metrics: [
      { name: "eventCount" },
    ],
    orderBys: [
      {
        metric: {
          metricName: "eventCount",
        },
        desc: true,
      },
    ],
    limit: limite,
  });

  return (response.rows || []).map((row) => ({
    evento: row.dimensionValues?.[0]?.value || "",
    quantidade: valor(row, 0),
  }));
}

async function whatsapp(periodo = "30") {
  const response = await executarRelatorio({
    dateRanges: [
      {
        startDate: normalizarPeriodo(periodo),
        endDate: "today",
      },
    ],
    dimensions: [
      { name: "eventName" },
    ],
    metrics: [
      { name: "eventCount" },
    ],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: {
          matchType: "EXACT",
          value: "whatsapp_click",
        },
      },
    },
  });

  return {
    evento: "whatsapp_click",
    quantidade: valor(response.rows?.[0], 0),
  };
}

async function relatorioCompleto(periodo = "30") {
  const [geral, topPaginas, canais, listaEventos, cliquesWhatsapp] =
    await Promise.all([
      resumo(periodo),
      paginas(periodo),
      origens(periodo),
      eventos(periodo),
      whatsapp(periodo),
    ]);

  return {
    ok: true,
    propertyId: PROPERTY_ID,
    periodo,
    atualizadoEm: new Date().toISOString(),
    resumo: geral,
    paginas: topPaginas,
    origens: canais,
    eventos: listaEventos,
    whatsapp: cliquesWhatsapp,
  };
}

module.exports = {
  PROPERTY_ID,
  resumo,
  paginas,
  origens,
  eventos,
  whatsapp,
  relatorioCompleto,
};
