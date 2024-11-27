import { onMounted } from 'vue'
import axios from 'axios'

export default defineNuxtPlugin(nuxtApp => {
    let isLoading: Ref<boolean> | undefined;

    // Use the onMounted lifecycle hook to ensure the page is initialized
    onMounted(() => {
        // Now you can safely access the isLoading ref
        isLoading = nuxtApp.$page.isLoading
    })

    // Axios instance
    const axiosInstance = axios.create({
        baseURL: 'http://127.0.0.1:8000/',
        headers: {
            'Content-Type': 'application/json',
            'client_id': '7c1495e2a8dffe2c9275b99cf93d89ea6b870f55015cb6f3db123e62ab6789cd',
            'client_secret': '68d9c4e015a8b22781a53c7fdd6a024eb3941d76130b6c86a2d8a7b5f01e3f457fa12378f962c4834bf025ac13e4c99011edb09b547fc0135e948c7a568ea981'
        },
    });

    // Request interceptor to show the loader
    axiosInstance.interceptors.request.use(
        config => {
            if (isLoading) isLoading.value = true;  // Show the loader
            return config
        },
        error => {
            if (isLoading) isLoading.value = false // Hide the loader if there's an error
            return Promise.reject(error)
        }
    )

    // Response interceptor to hide the loader
    axiosInstance.interceptors.response.use(
        response => {
            if (isLoading) isLoading.value = false // Hide the loader on success
            return response
        },
        error => {
            if (isLoading) isLoading.value = false // Hide the loader if there's an error
            return Promise.reject(error)
        }
    )

    // Make axios instance available globally
    nuxtApp.provide('axios', axiosInstance)
})
