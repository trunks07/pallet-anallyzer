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
    import { AxiosInstance } from 'axios' // Import AxiosInstance
    import Loader from '~/components/Loader.vue' // Assuming you have a Loader component

    const isLoading = ref(false)
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
    const { $axios } = useNuxtApp() as { $axios: AxiosInstance };

    const products = ref([]);
    const catalogs = ref([]);
    const searchable = ref([])
    const searchResults = ref([])
    const analysis = ref([])
    const defaultSearchable = ref([])
    const state = reactive({
        product_count: 0
    });

    const isBulk = ref(false)
    const bulkArray = ref([])
    const selectedArray = ref([])
    const bulkAnalysisData = ref([])

    onMounted(async () => {
        isLoading.value = true; // Set loading to true before the request

        try {
            const catalog_response = await $axios.get("/catalogs/get-catalogs");
            catalogs.value = catalog_response.data.data;

            const bc_product_response = await $axios.get("/catalogs/get-products");
            products.value = bc_product_response.data.data;

            let exists = []

            // Access the array inside the ref with products.value
            products.value.forEach(function(product, index) {
                catalogs.value.forEach(function(catalog, index){
                    if (product.number == catalog.product_id){
                        if (exists.indexOf(product.number) == -1){
                            searchable.value.push(product)
                            exists.push(product.number)
                        }
                    }
                })
            });

            let searchResultexists = []
            searchResults.value = []
            let limit = 99

            searchable.value.forEach(function(product, index){
                if (searchResultexists.indexOf(product.number) == -1 && searchResultexists.length <= limit){
                    searchResults.value.push(product)
                    searchResultexists.push(product.number)
                }
            })

            defaultSearchable.value = searchable.value 

            state.product_count = searchable.value.length;
        } catch (error) {
            console.error("Error fetching catalogs:", error);
        } finally {
            isLoading.value = false; // Set loading to false after the request completes
        }
    });


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
            searchable.value = defaultSearchable.value
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

            const ai_response = await $axios.post("/analyzer/analyze-image", body);
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
        isBulkModalLoading.value = true
        isBulkModalOpen.value = true

        let body = {
            items: bulkArray.value
        }

        const ai_response = await $axios.post("/analyzer/bulk-analyze-image", body);
        bulkAnalysisData.value = ai_response.data.data

        isBulkModalLoading.value = false

        bulkArray.value = []
        selectedArray.value = []
        isBulk.value = false
    }
</script>

<template>
    <UDashboardCard
        title="Products"
        :description="`You have ${state.product_count} available.`"
        icon="i-heroicons-archive-box-20-solid">
        
        <div class="space-y-2">
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
                <div v-if="isBulk" class="text-center">
                    <UButton icon="i-heroicons-check-20-solid" :disabled="state.product_count == 0" @click="processBulkAnalysis"> Done</UButton>
                    &nbsp;
                    <UButton icon="i-heroicons-x-mark-20-solid" :disabled="state.product_count == 0" @click="clickBulkAnalysis"> Cancel</UButton>
                </div>
                <UButton v-else icon="i-heroicons-command-line-20-solid" :disabled="state.product_count == 0" @click="clickBulkAnalysis"> Bulk Analysis</UButton>
            </div>
        </div>

        <!-- Show loader when isLoading is true -->
        <div v-if="isLoading" class="loader-container">
            <Loader /> 
        </div>

        <div class="space-y-2 mt-2" v-for="product in searchResults" :key="product.number">
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
                            <UButton :data-sku="product?.number" @click="clickCard" icon="i-heroicons-command-line-20-solid"></UButton>
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
    </UDashboardCard>

    <UModal v-model="isModalOpen">
        <div class="p-4 h-48" v-if="isModalLoading">
            <div v-if="isModalLoading" class="loader-container">
                <Loader />
            </div>
        </div>

        <div class="p-4" v-else>
            <template v-for="ai_analysis in analysis">
                <div class="mt-2 md-4 ml-1">
                    <p class="pd-2"><b>Overall Comment: </b>{{ ai_analysis?.overall_comment }}</p>
                </div>
                <template v-for="pallet in ai_analysis?.pallets">
                    <UCard class="mt-2 md-4">
                        <div class="md-2 pd-4">
                            <b>Dimension: {{ pallet?.pallet_dimensions?.length }} X {{ pallet?.pallet_dimensions?.width }}</b>
                        </div>
                        <div class="md-4 mt-4">
                            <p><b>Overall Height: {{ pallet?.overall_height }}</b></p>
                            <p><b>Overall Weight: {{ pallet?.overall_weight }}</b></p>
                        </div>
                        <template v-for="parts in pallet.product_parts">
                            <div class="md-4 mt-4">
                                <p><b>Part:</b> {{ parts?.part }}</p>
                            </div>
                            <div class="md-4 mt-4">
                                <p><b>Orientation:</b> {{ parts?.orientation }}</p>
                                <p><b>Comment: </b>{{ parts?.comment }}</p>
                                <br v-if="pallet?.product_parts.length > 1">
                            </div>
                        </template>
                    </UCard>
                </template>
            </template>
        </div>
    </UModal>

    <UModal v-model="isBulkModalOpen">
        <div class="p-4 h-48" v-if="isBulkModalLoading">
            <div v-if="isBulkModalLoading" class="loader-container">
                <Loader />
            </div>
        </div>

        <div class="p-4" v-else>
            <template v-for="(item, index) in bulkAnalysisData">
                <div v-for="ai_analysis in item?.response">
                    <div class="mt-2 md-4 ml-1">
                        <p class="pd-2"><b>{{ item?.title }}</b></p><br>
                        <p class="pd-2"><b>Overall Comment: </b>{{ ai_analysis?.overall_comment }}</p>
                    </div>
                    <template v-for="pallet in ai_analysis?.pallets">
                        <UCard class="mt-2 md-4">
                            <div class="md-2 pd-4">
                                <b>Dimension: {{ pallet?.pallet_dimensions?.length }} X {{ pallet?.pallet_dimensions?.width }}</b>
                            </div>
                            <div class="md-4 mt-4">
                                <p><b>Overall Height: {{ pallet?.overall_height }}</b></p>
                                <p><b>Overall Weight: {{ pallet?.overall_weight }}</b></p>
                            </div>
                            <template v-for="parts in pallet.product_parts">
                                <div class="md-4 mt-4">
                                    <p><b>Part:</b> {{ parts?.part }}</p>
                                </div>
                                <div class="md-4 mt-4">
                                    <p><b>Orientation:</b> {{ parts?.orientation }}</p>
                                    <p><b>Comment: </b>{{ parts?.comment }}</p>
                                    <br v-if="pallet?.product_parts.length > 1">
                                </div>
                            </template>
                        </UCard>
                    </template>
                </div>
                <template v-if="index+1 < bulkAnalysisData.length">
                    <br>
                    <UDivider label="Analysis" />
                    <br>
                </template>
            </template>
        </div>
    </UModal>
</template>