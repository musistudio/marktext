<template>
    <div class="github-page">
      <section class="pref-text-box-item" :class="{'ag-underdevelop': disable}">
        <div class="description">
          <span>{{description}}:</span>
        </div>
        <el-input
          class="input"
          v-model="themeUrl"
          size="small"
          clearable>
        </el-input>
      </section>
      <el-button @click="downloadTheme">download</el-button>
    </div>
</template>

<script>
import TextBox from '../common/textBox'

export default {
  name: 'index',
  components: {
    TextBox
  },
  data () {
    return {
      themeUrl: '',
      description: 'Theme URL'
    }
  },
  methods: {
    themeChange (value) {
      this.themeUrl = value
    },
    downloadTheme () {
      this.$store.dispatch('DOWNLOAD_THEME', this.themeUrl)
    }
  }
}
</script>

<style scoped>

</style>
