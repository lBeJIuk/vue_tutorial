const API_KEY = localStorage.getItem("token");
const AGGREGATE_INDEX = 5;
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
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}
function unsubsctibeToTickerFromWs(ticker) {
  sendMessage({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~USD`]
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

const tickersHandlers = new Map();

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
  const { TYPE: type, FROMSYMBOL: currency, PRICE: newPrice } = JSON.parse(
    e.data
  );
  if (type != AGGREGATE_INDEX || newPrice === undefined) {
    return;
  }
  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach(fn => fn(newPrice));
}

export const loadAllCoins = () =>
  fetch(
    `https://min-api.cryptocompare.com/data/all/coinlist?summary=true&api_key=${API_KEY}`
  ).then(r => r.json());

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subsctibeToTickerOnWs(ticker);
};

export const unsubscribeFromTicker = ticker => {
  tickersHandlers.delete(ticker);
  unsubsctibeToTickerFromWs(ticker);
};
