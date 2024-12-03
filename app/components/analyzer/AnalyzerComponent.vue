<style scoped>
    /* Ensure loader aligns properly */
    .loader-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
    }

    /* Flex layout for the card content */
    .product-card-content {
        display: flex;
        justify-content: space-between; /* Details on the left, button on the right */
        align-items: center;
    }

    .product-details {
        flex: 1; /* Takes up remaining space */
    }

    .product-action {
        margin-left: 10px;
    }

    .loader-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
    }
</style>

<script setup lang="ts">
    import { ref, reactive, onMounted, computed } from 'vue';
    import { useNuxtApp } from '#app';
    import { type AxiosInstance } from 'axios' // Import AxiosInstance
    import Loader from '~/components/Loader.vue' // Assuming you have a Loader component

    const isLoading = ref(true)
    const isModalOpen = ref(false)
    const isModalLoading = ref(false)
    const isBulkModalOpen = ref(false)
    const isBulkModalLoading = ref(false)
    const toast = useToast()

    // Expose the isLoading state globally for page transitions
    defineExpose({
        isLoading
    })

    // Declare the type of $axios to be AxiosInstance
    const { $axios } = useNuxtApp() as unknown as { $axios: AxiosInstance };

    const catalogs = ref([]);
    const searchable = ref([])
    const searchResults = ref([])
    const analysis = ref({
        overall_comment: "",
        pallets: []
    })
    const defaultSearchable = ref([])
    const state = reactive({
        product_count: 0
    });

    const isBulk = ref(false)
    const products = ref([])
    const bulkArray = ref([])
    const selectedArray = ref([])
    const bulkAnalysisData = ref([])

    const isShowLists = ref(false)
    const loadedItems = ref([])

    const isQuery = ref(false)

    onMounted(async () => {
        isLoading.value = true; // Set loading to true before the request

        try {
            const product_response = await $axios.get("/catalogs/get-available-products");

            searchable.value = product_response.data.data;
            products.value = product_response.data.data;

            searchable.value = [...searchable.value].sort((a, b) => {
                return a.title.localeCompare(b.title);
            })

            let searchResultexists = []
            searchResults.value = []
            let limit = 49

            searchable.value.forEach(function(product, index){
                if (searchResultexists.indexOf(product.number) == -1 && searchResultexists.length <= limit){
                    searchResults.value.push(product)
                    searchResultexists.push(product.number)
                }
            })

            defaultSearchable.value = searchResults.value 
            loadedItems.value = searchResultexists

            state.product_count = searchable.value.length;

            window.addEventListener('scroll', onScroll)

            loadMore()
        } catch (error) {
            console.error("Error fetching catalogs:", error);
        } finally {
            isLoading.value = false; // Set loading to false after the request completes
        }
    });

    const sortedItems = computed(() => {
        return [...searchResults.value].sort((a, b) => {
            return a.title.localeCompare(b.title);
        });
    })

    const loadMore = () => {
        let limit = loadedItems.value.length + 49

        isLoading.value = true

        searchable.value.forEach(function(product, index){
            if (loadedItems.value.indexOf(product.number) == -1 && loadedItems.value.length <= limit){
                searchResults.value.push(product)
                loadedItems.value.push(product.number)
            }
        })

        isLoading.value = false
    }

    const onScroll = () => {
        const scrollPosition = window.scrollY + window.innerHeight
        const documentHeight = document.documentElement.scrollHeight

        // Debugging: Log scroll position and document height
        console.log('Scroll Position:', scrollPosition)
        console.log('Document Height:', documentHeight)

        const isAtBottom = scrollPosition >= documentHeight - 10
        if (isAtBottom && !isLoading.value) {
            loadMore()
        }
    }

    const handleInput = (event: Event) => {
        const target = event.target as HTMLInputElement;
        let exists = []
        searchResults.value = []
        let limit = 99

        searchable.value.forEach(function(product, index){
            if (product.description.toLowerCase().includes(target.value.toLowerCase()) && exists.indexOf(product.number) == -1 && exists.length <= limit){
                searchResults.value.push(product)
                exists.push(product.number)
            }
        })

        searchable.value.forEach(function(product, index){
            if (product.number.toLowerCase().includes(target.value.toLowerCase()) && exists.indexOf(product.number) == -1 && exists.length <= limit){
                searchResults.value.push(product)
                exists.push(product.number)
            }
        })

        state.product_count = searchResults.value.length

        if (target.value == ""){
            searchResults.value = []
            state.product_count = searchable.value.length;
            searchResults.value = defaultSearchable.value

            isQuery.value = false
        }else{
            isQuery.value = true
        }
    };

    const clickCard = async (event: Event) => {
        const target = event.currentTarget as HTMLElement
        const sku = target.getAttribute('data-sku');
        let name = ""

        products.value.forEach(function(product, index){
            if (product.number == sku){
                name = product.title
            }
        })

        isModalLoading.value = true
        isModalOpen.value = true

        if (sku){
            let body = {
                "sku": sku,
                "name": name
            }

            const ai_response = await $axios.post("/analyzer/gpt-image-analyzer", body);
            analysis.value = ai_response.data.data;

            isModalLoading.value = false
        }else{
            toast.add({ title: 'SKU not found!' })

            isModalLoading.value = false
            isModalOpen.value = false
        }
    }

    const clickBulkAnalysis = (event: Event) => {
        isBulk.value = !isBulk.value

        bulkArray.value = []
        selectedArray.value = []
    }

    const toggleMultiAnalisys = (event: Event) => {
        const target = event.currentTarget as HTMLElement
        const sku = target.getAttribute('data-sku');
        const name = target.getAttribute('data-title');

        let record = selectedArray.value.indexOf(sku)
        if (record  == -1){
            bulkArray.value.push({"sku": sku, "name": name})
            selectedArray.value.push(sku)
        }else{
            selectedArray.value.splice(record, 1)
            bulkArray.value.splice(record, 1)
        }
    }

    const processBulkAnalysis = async (event: Event) => {
        if(bulkArray.value.length > 0){
            isBulkModalLoading.value = true
            isBulkModalOpen.value = true

            let body = {
                items: bulkArray.value
            }

            const ai_response = await $axios.post("/analyzer/bulk-gpt-image-analyzer", body);
            bulkAnalysisData.value = ai_response.data.data
            // bulkAnalysisData.value = ai_response.data

            isBulkModalLoading.value = false

            bulkArray.value = []
            selectedArray.value = []
            isBulk.value = false
        }else{
            toast.add({ title: 'Select a product to analyze first!' })
        }
    }

    const showList = (event: Event) => {
        if(bulkArray.value.length > 0){
            isShowLists.value = true
        }else{
            toast.add({ title: 'Select a product to analyze first!' })
        }
    }

    const removeArrayItem = (event: Event) => {
        const target = event.currentTarget as HTMLElement
        const sku = target.getAttribute('data-sku');

        let record = selectedArray.value.indexOf(sku)
        selectedArray.value.splice(record, 1)
        bulkArray.value.splice(record, 1)

        if(bulkArray.value.length == 0){
            isShowLists.value = false
        }
    }
</script>

<template>
    <UDashboardCard
        title="Products"
        :description="`You have ${state.product_count} available.`"
        icon="i-heroicons-tag">
        
        <div class="space-y-2 mb-4">
            <div class="flex justify-between">
                <UInput
                    icon="i-heroicons-magnifying-glass-20-solid"
                    size="sm"
                    color="white"
                    :trailing="false"
                    placeholder="Search..."
                    @input="handleInput"
                    :disabled="isLoading"
                />
                <UButton v-if="!isBulk" icon="i-heroicons-folder-open" :disabled="state.product_count == 0" @click="clickBulkAnalysis"> Bulk Analysis</UButton>
            </div>
        </div>

        <!-- Show loader when isLoading is true -->
        <div v-if="isLoading" class="loader-container">
            <Loader /> 
        </div>
        <template v-if="!isLoading">
            <div class="space-y-2 mt-2 mb-4" v-for="product in sortedItems" :key="product.number">
                <UCard class="product-card">
                    <!-- Flex container -->
                    <div class="product-card-content">
                        <!-- Details on the left -->
                        <div class="product-details">
                            <p>{{ product?.description }}</p>
                            <small>{{ product?.number }}</small>
                        </div>
                        <!-- Button on the right -->
                        <div class="product-action">
                            <template v-if="!isBulk">
                                <UButton :data-sku="product?.number" @click="clickCard" icon="i-heroicons-document-magnifying-glass"></UButton>
                            </template>
                            <template v-else>
                                <UToggle
                                    on-icon="i-heroicons-check-20-solid"
                                    off-icon="i-heroicons-x-mark-20-solid"
                                    :model-value="selectedArray.includes(product?.number)"
                                    :data-sku="product?.number"
                                    :data-title="product?.title"
                                    @click="toggleMultiAnalisys"
                                />
                            </template>
                        </div>
                    </div>
                </UCard>
            </div>
        </template>
        <div v-if="!isLoading && !isQuery" class="flex items-center justify-center">
            <UButton icon="i-heroicons-arrow-path" @click="loadMore">Load More</UButton>
        </div>
    </UDashboardCard>

    <UModal v-model="isModalOpen">
        <div class="p-4 h-48" v-if="isModalLoading">
            <div v-if="isModalLoading" class="loader-container">
                <Loader />
            </div>
        </div>

        <div class="p-4" v-else>
            <div class="mt-2 md-4 ml-1">
                <p class="pd-2"><b>Overall Comment:</b></p>
                <p>{{ analysis?.overall_comment }}</p>
            </div>
            <template v-for="pallet in analysis?.pallets">
                <UCard class="mt-2 md-4">
                    <div class="md-2 pd-4">
                        <b>Pallet Dimension: {{ pallet?.pallet_dimensions?.length }} X {{ pallet?.pallet_dimensions?.width }}</b>
                    </div>
                    <div class="mb-4 mt-4">
                        <p><b>Height:</b> {{ pallet?.overall_height }} <i>(Inch)</i></p>
                        <p><b>Weight:</b> {{ pallet?.overall_weight }} <i>(Kg)</i></p>
                    </div>

                    <UDivider />

                    <template v-for="parts in pallet.product_parts">
                        <div class="md-4 mt-4">
                            <p><b>Part:</b> {{ parts?.part }}</p>
                            <p><b>Description:</b> {{ parts?.description }}</p>
                        </div>
                        <div class="pb-4 mt-4">
                            <p><b>Orientation:</b> {{ parts?.orientation }}</p>
                            <p><b>Comment:</b></p>
                            <p>{{ parts?.comment }}</p>
                        </div>
                    </template>
                </UCard>
            </template>
        </div>
    </UModal>

    <UModal v-model="isBulkModalOpen" class="m-2">
        <div class="p-4 h-48" v-if="isBulkModalLoading">
            <div v-if="isBulkModalLoading" class="loader-container">
                <Loader />
            </div>
        </div>
        <div class="p-4" v-else>
            <template v-for="(item, index) in bulkAnalysisData">
                <div class="mt-2 md-4 ml-1">
                    <p class="mb-2"><b>Name:</b> {{ item?.name }}</p>
                    <p class="pd-2"><b>Overall Comment:</b></p>
                    <p>{{ item?.overall_comment }}</p>
                </div>
                <template v-for="pallet in item?.pallets">
                    <UCard class="mt-2 md-4">
                        <div class="md-2 pd-4">
                            <b>Pallet Dimension: {{ pallet?.pallet_dimensions?.length }} X {{ pallet?.pallet_dimensions?.width }}</b>
                        </div>
                        <div class="mb-4 mt-4">
                            <p><b>Height:</b> {{ pallet?.overall_height }} <i>(Inch)</i></p>
                            <p><b>Weight:</b> {{ pallet?.overall_weight }} <i>(Kg)</i></p>
                        </div>

                        <UDivider />

                        <template v-for="parts in pallet.product_parts">
                            <div class="md-4 mt-4">
                                <p><b>Part:</b> {{ parts?.part }}</p>
                                <p><b>Description:</b> {{ parts?.description }}</p>
                            </div>
                            <div class="pb-4 mt-4">
                                <p><b>Orientation:</b> {{ parts?.orientation }}</p>
                                <p><b>Comment:</b></p>
                                <p>{{ parts?.comment }}</p>
                            </div>
                        </template>
                    </UCard>
                </template>
                <template v-if="index+1 < bulkAnalysisData.length">
                    <br>
                    <UDivider label="Analysis" />
                    <br>
                </template>
            </template>
        </div>
    </UModal>

    <UModal v-model="isShowLists">
        <strong class="m-4">Selected Products</strong>
        <template v-for="bulkData in bulkArray">
            <UCard class="m-2">
                <div class="flex justify-between">
                    <div>
                        <p>{{ bulkData?.name }}</p>
                        <small>{{ bulkData?.sku }}</small>
                    </div>
                    <UButton icon="i-heroicons-trash" class="w-10 h-10 flex items-center justify-center" :data-sku="bulkData?.sku" @click="removeArrayItem"></UButton>
                </div>
            </UCard>
        </template>
    </UModal>

    <template v-if="isBulk">
        <UCard class="fixed bottom-20 right-20 transform translate-x-1/2 flex flex-row items-center z-50">
            <UButton
                class="w-10 h-10 mb-2 flex items-center justify-center rounded-full"
                icon="i-heroicons-clipboard-document-list"
                @click="showList"
            >
            </UButton>
            <UButton
                class="w-10 h-10 mb-2 flex items-center justify-center rounded-full"
                icon="i-heroicons-check-20-solid"
                :disabled="state.product_count == 0"
                @click="processBulkAnalysis"
            >
            </UButton>
            <UButton
                class="w-10 h-10 mb-2 flex items-center justify-center rounded-full"
                icon="i-heroicons-x-mark-20-solid"
                :disabled="state.product_count == 0"
                @click="clickBulkAnalysis"
            >
            </UButton>
        </UCard>
    </template>
</template>