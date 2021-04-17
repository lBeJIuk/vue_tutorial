const API_KEY = localStorage.getItem("token");
const AGGREGATE_INDEX = "5";
const INVALID_SUB = "500";
const INVALID_SUB_MESSAGE = "INVALID_SUB";
const AGGREGATE_INDEX_TOPIC = "5~CCCAGG~";
const TYPES = {
  RUNNING: 1,
  REQUEST: 2,
  DATA: 3
};
let CONFIGURED = false;
let socket = null;

function subsctibeToTickerOnWs(ticker, target = "USD") {
  sendMessage({
    action: "SubAdd",
    subs: [`${AGGREGATE_INDEX_TOPIC}${ticker}~${target}`]
  });
}
function unsubsctibeToTickerFromWs(ticker, target = "USD") {
  sendMessage({
    action: "SubRemove",
    subs: [`${AGGREGATE_INDEX_TOPIC}${ticker}~${target}`]
  });
}
function sendMessage(message) {
  const stringifiedMessage = JSON.stringify(message);
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }
  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifiedMessage);
    },
    { once: true }
  );
}

const tickersSuccessHandlers = new Map();
const tickersErrorHandlers = new Map();
const tickerCrossConvert = new Map();
let btc_to_usd;

var bc = new BroadcastChannel("tabs");
bc.addEventListener("message", function(message) {
  if (message.data.type === TYPES.REQUEST) {
    bc.postMessage({ typ: TYPES.RUNNING });
  } else if (message.data.type === TYPES.RUNNING) {
    CONFIGURED = true;
  } else if (message.data.type === TYPES.DATA) {
    handleResponse(message.data);
  }
});

bc.postMessage({ type: TYPES.REQUEST });

setTimeout(function() {
  if (CONFIGURED === false) {
    CONFIGURED = true;
    socket = new WebSocket(
      `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
    );

    // internal subscription
    subscribeToTicker("BTC", () => {});

    socket.addEventListener("message", e => {
      bc.postMessage({ type: TYPES.DATA, data: e.data });
      handleResponse(e);
    });
  }
}, 1);

function handleResponse(e) {
  const {
    TYPE: type,
    FROMSYMBOL: tmpCurrency,
    PRICE: newPrice,
    MESSAGE: message,
    PARAMETER: parametr,
    TOSYMBOL: to
  } = JSON.parse(e.data);
  const currency = tmpCurrency
    ? tmpCurrency
    : parametr?.replace(AGGREGATE_INDEX_TOPIC, "").split("~")[0];
  if (!currency) {
    return false;
  }
  switch (type) {
    case AGGREGATE_INDEX:
      if (newPrice !== undefined) {
        if (currency === "BTC" && tickerCrossConvert.size > 0) {
          if (to === "USD") {
            btc_to_usd = newPrice;
          } else {
            tickerCrossConvert.set(to, newPrice);
          }
          // update all crossconverted
          _crossconvert();
        }
        if (tickerCrossConvert.has(currency)) {
          // target currescy changed
          tickerCrossConvert.set(currency, newPrice);
          _crossconvert();
        } else {
          const handlers = tickersSuccessHandlers.get(currency) ?? [];
          handlers.forEach(fn => fn(newPrice));
        }
      }
      break;
    case INVALID_SUB:
      if (message === INVALID_SUB_MESSAGE) {
        if (tickerCrossConvert.has(currency)) {
          // Already cross converted, but stil no data
          const handlers = tickersErrorHandlers.get(currency) ?? [];
          handlers.forEach(fn => fn());
        } else {
          // Try to crossconvert
          // unsubscribeFromTicker(currency);
          subsctibeToTickerOnWs(currency, "BTC");
          tickerCrossConvert.set(currency, 0);
        }
      }
      break;
  }
}

export const loadAllCoins = () =>
  fetch(
    `https://min-api.cryptocompare.com/data/all/coinlist?summary=true&api_key=${API_KEY}`
  ).then(r => r.json());

export const subscribeToTicker = (ticker, cbSuccess, cbError) => {
  const subscribers = tickersSuccessHandlers.get(ticker) || [];
  tickersSuccessHandlers.set(ticker, [...subscribers, cbSuccess]);
  tickersErrorHandlers.set(ticker, [...subscribers, cbError]);
  subsctibeToTickerOnWs(ticker);
};

export const unsubscribeFromTicker = ticker => {
  tickersSuccessHandlers.delete(ticker);
  tickerCrossConvert.delete(ticker);
  // BTC is internal currency
  if (ticker !== "BTC") {
    unsubsctibeToTickerFromWs(ticker);
  }
};

function _crossconvert() {
  tickerCrossConvert.forEach((v, currency) => {
    const newPrice = v * btc_to_usd;
    const handlers = tickersSuccessHandlers.get(currency) ?? [];
    handlers.forEach(fn => fn(newPrice));
  });
}
