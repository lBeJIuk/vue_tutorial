<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-700"
          >Тикер</label
        >
        <div class="mt-1 relative rounded-md shadow-md">
          <input
            @keyDown.enter="add"
            v-model="ticker"
            type="text"
            name="wallet"
            id="wallet"
            class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
            placeholder="Например DOGE"
          />
        </div>
        <div
          v-if="ticker !== '' && autocompletteTickers.length !== 0"
          class="flex bg-white shadow-md p-1 rounded-md shadow-md flex-wrap"
        >
          <span
            v-for="(item, index) in autocompletteTickers"
            :key="index"
            class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
            @click="addFromAutocomplette(item)"
          >
            {{ item }}
          </span>
        </div>
        <div v-if="tickerErrorMessage !== ''" class="text-sm text-red-600">
          {{ tickerErrorMessage }}
        </div>
      </div>
    </div>
    <add-button @click="add" type="button" :disabled="disabled" />
  </section>
</template>

<script>
import AddButton from "./AddButton.vue";

export default {
  components: {
    AddButton
  },
  props: {
    disabled: {
      type: Boolean,
      required: false,
      default: false
    },
    tickerErrorMessage: {
      type: String,
      required: false,
      default: ""
    },
    coinsList: {
      type: Array,
      required: false,
      default: () => []
    }
  },
  emits: {
    "add-ticker": value => typeof value === "string"
  },
  data() {
    return {
      ticker: ""
    };
  },
  methods: {
    add() {
      if (this.disabled) {
        return;
      }
      this.$emit("add-ticker", this.ticker);
      this.ticker = "";
    },
    addFromAutocomplette(newTicker) {
      if (this.disabled) {
        return;
      }
      this.$emit("add-ticker", newTicker);
      this.ticker = "";
    }
  },
  computed: {
    autocompletteTickers() {
      return this.coinsList
        .filter(
          item =>
            item.symbol.includes(this.ticker.toLowerCase()) ||
            item.fullname.includes(this.ticker.toLowerCase())
        )
        .slice(0, 4)
        .map(item => item.symbol);
    }
  }
};
</script>
