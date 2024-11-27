import { Ref } from 'vue'

declare module '#app' {
    interface NuxtApp {
        $page: {
        isLoading: Ref<boolean>
        get: Function
        }
    }
}
