<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <template v-if="loadingMask">
      <div
        class="fixed w-100 h-100 opacity-80 bg-purple-800 inset-0 z-50 flex items-center justify-center"
      >
        <svg
          class="animate-spin -ml-1 mr-3 h-12 w-12 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    </template>
    <div class="container">
      <add-ticker-view
        @add-ticker="add"
        :disabled="tooManyTicketsAdded"
        :tickerErrorMessage="tickerErrorMessage"
        :coinsList="coinsList"
      />
      <template v-if="tickers.length > 0">
        <hr class="w-full border-t border-gray-600 my-4" />
        <div>
          <button
            v-if="page > 1"
            @click="page = page - 1"
            class="mx-2 my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            backward
          </button>
          <button
            v-if="hasNextPage"
            @click="page = page + 1"
            class="mx-2 my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            forward
          </button>
        </div>
        <div>Page: {{ page }}</div>

        Filter: <input v-model="filter" />
        <hr class="w-full border-t border-gray-600 my-4" />
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div
            v-for="t in paginatedTickers"
            :key="t.name"
            @click="select(t)"
            class="bg-white overflow-hidden shadow rounded-lg border-purple-800
            border-solid cursor-pointer"
            :class="{
              'border-4': selectedTicker === t,
              'bg-red-100': t.invalid === true
            }"
          >
            <div class="px-4 py-5 sm:p-6 text-center">
              <dt class="text-sm font-medium text-gray-500 truncate">
                {{ t.name }} - USD
              </dt>
              <dd class="mt-1 text-3xl font-semibold text-gray-900">
                {{ formatPrice(t.price) }}
              </dd>
            </div>
            <div class="w-full border-t border-gray-200"></div>
            <button
              @click.stop="handleDelete(t)"
              class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 hover:opacity-20 transition-all focus:outline-none"
            >
              <svg
                class="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="#718096"
                aria-hidden="true"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                ></path></svg
              >Удалить
            </button>
          </div>
        </dl>
        <hr class="w-full border-t border-gray-600 my-4" />
      </template>
      <chart-view
        @close="chartClose"
        :selectedTicker="selectedTicker"
        :tickers="tickers"
      />
    </div>
  </div>
</template>

<script>
import {
  loadAllCoins,
  subscribeToTicker,
  unsubscribeFromTicker
} from "./api.js";

import AddTickerView from "./components/AddTickerView.vue";
import ChartView from "./components/ChartView.vue";

export default {
  name: "App",
  components: {
    AddTickerView,
    ChartView
  },
  data() {
    return {
      tickers: [],
      selectedTicker: null,
      coinsList: [],
      loadingMask: true,
      tickerErrorMessage: "",
      filter: "",
      page: 1
    };
  },
  methods: {
    chartClose() {
      this.selectedTicker = null;
    },
    formatPrice(price) {
      if (typeof price === "number") {
        return price > 1 ? price.toFixed(2) : price.toPrecision(2);
      } else {
        return "-";
      }
    },
    add(ticker) {
      const newTicker = {
        name: ticker,
        price: "-",
        invalid: false
      };
      if (
        this.tickers.find(ticker => ticker.name === newTicker.name) !==
        undefined
      ) {
        this.tickerErrorMessage = "Already exists";
        return;
      }
      if (ticker === "") {
        this.tickerErrorMessage = "Empty value";
        return;
      }
      if (
        this.coinsList.find(
          coin => coin.symbol === newTicker.name.toLowerCase()
        ) === undefined
      ) {
        this.tickerErrorMessage = "coin not exists";
        return;
      }

      this.tickers = [...this.tickers, newTicker];
      this.tickerErrorMessage = "";
      this.filter = "";

      subscribeToTicker(
        newTicker.name,
        (newTicker.name,
        price => {
          this.updateTickers(newTicker.name, price);
        }),
        (newTicker.name,
        () => {
          this.updateTickers(newTicker.name, "_", true);
        })
      );
    },
    handleDelete(toRemove) {
      this.tickers = this.tickers.filter(t => t !== toRemove);
      if (this.selectedTicker === toRemove) {
        this.selectedTicker = null;
      }
      unsubscribeFromTicker(toRemove.name);
    },
    select(t) {
      this.selectedTicker = t;
    },
    updateTickers(tickerName, price, invalid = false) {
      this.tickers
        .filter(t => t.name === tickerName)
        .forEach(t => {
          t.price = price;
          t.invalid = invalid;
        });
    }
  },
  computed: {
    tooManyTicketsAdded() {
      return this.tickers.length > 4;
    },
    startIndex() {
      return (this.page - 1) * 6;
    },
    endIndex() {
      return this.page * 6;
    },
    filteredTickers() {
      return this.tickers.filter(item =>
        item.name.toLowerCase().includes(this.filter.toLowerCase())
      );
    },
    paginatedTickers() {
      return this.filteredTickers.slice(this.startIndex, this.endIndex);
    },
    hasNextPage() {
      return this.filteredTickers.length > this.endIndex;
    },
    pageStateOptions() {
      return { filter: this.filter, page: this.page };
    }
  },
  async created() {
    const data = await loadAllCoins();
    this.coinsList = Object.keys(data.Data).map(symbol => ({
      fullname: data.Data[symbol].FullName.toLowerCase(),
      symbol: data.Data[symbol].Symbol.toLowerCase()
    }));
    this.loadingMask = false;

    const windowData = Object.fromEntries(
      new URL(window.location).searchParams.entries()
    );
    if (windowData.filter) {
      this.filter = windowData.filter;
    }
    if (windowData.page) {
      this.page = windowData.page;
    }

    const tickersData = localStorage.getItem("cryptonomicon-list");
    if (tickersData) {
      this.tickers = JSON.parse(tickersData);
      this.tickers.forEach(t => {
        subscribeToTicker(
          t.name,
          price => {
            this.updateTickers(t.name, price);
          },
          () => {
            this.updateTickers(t.name, "_", true);
          }
        );
      });
    }
    setInterval(this.updateTickers, 5000);
  },
  watch: {
    ticker() {
      this.tickerErrorMessage = "";
    },
    tickers() {
      localStorage.setItem("cryptonomicon-list", JSON.stringify(this.tickers));
    },
    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    },
    filter() {
      this.page = 1;
    },
    pageStateOptions(value) {
      window.history.pushState(
        null,
        document.title,
        `${window.location.pathname}?filter=${value.filter}&page=${value.page}`
      );
    }
  }
};
</script>
