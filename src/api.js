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

function subsctibeToTickerOnWs(ticker) {
  sendMessage({
    action: "SubAdd",
    subs: [`${AGGREGATE_INDEX_TOPIC}${ticker}~USD`]
  });
}
function unsubsctibeToTickerFromWs(ticker) {
  sendMessage({
    action: "SubRemove",
    subs: [`${AGGREGATE_INDEX_TOPIC}${ticker}~USD`]
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
    socket.addEventListener("message", e => {
      bc.postMessage({ type: TYPES.DATA, data: e.data });
      handleResponse(e);
    });
  }
}, 1);

function handleResponse(e) {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    PRICE: newPrice,
    MESSAGE: message,
    PARAMETER: parametr
  } = JSON.parse(e.data);
  debugger;
  switch (type) {
    case AGGREGATE_INDEX:
      if (newPrice !== undefined) {
        const handlers = tickersSuccessHandlers.get(currency) ?? [];
        handlers.forEach(fn => fn(newPrice));
      }
      break;
    case INVALID_SUB:
      if (message === INVALID_SUB_MESSAGE) {
        const tmpCurrency = currency
          ? currency
          : parametr.replace(AGGREGATE_INDEX_TOPIC, "").split("~")[0];
        const handlers = tickersErrorHandlers.get(tmpCurrency) ?? [];
        handlers.forEach(fn => fn());
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
  unsubsctibeToTickerFromWs(ticker);
};
