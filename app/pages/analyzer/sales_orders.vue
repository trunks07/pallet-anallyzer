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
    import { type AxiosInstance } from 'axios'
    import Loader from '~/components/Loader.vue'

    const { $axios } = useNuxtApp() as unknown as { $axios: AxiosInstance };

    const toast = useToast()

    const isLoading = ref(true)
    const salesOrders = ref([])
    const nextPageUrl = ref("")
    const search = ref("")
    const isSearching = ref(false)
    const defaultItems = ref([])
    const line_item_analysys = ref([])
    const isAnalysisModalOpen = ref(false)
    const isAnalysing = ref(true)
    
    onMounted(async function(){
        const sales_order_response = await $axios.get("/catalogs/get-sales-orders");
        salesOrders.value = sales_order_response.data.data.value
        nextPageUrl.value = sales_order_response.data.data.next_url

        defaultItems.value = sales_order_response.data.data.value

        isLoading.value = false
    })

    async function searchItem(event: Event){
        if(search.value != ""){
            isSearching.value = true
            let body = {
                "order_no": search.value
            }

            const sales_order_response = await $axios.post("/catalogs/search-sales-orders", body);
            salesOrders.value = sales_order_response.data.data.value

            isSearching.value = false
        }else{
            toast.add({ title: 'Input Order Number First!' })
        }
        
    }

    function handleInput(event: Event){
        const target = event.target as HTMLInputElement;

        if(target.value != ""){
            // Do nothing
        }else{
            salesOrders.value = defaultItems.value
        }
    }

    async function analyzeItems(event: Event){
        const target = event.currentTarget as HTMLElement
        const order_no = target.getAttribute('data-number');

        isAnalysisModalOpen.value = true
        isAnalysing.value = true

        let orderLinesBody = {
            "order_no": order_no
        }

        let analysis_array = []

        const order_lines = await $axios.post("/catalogs/get-sales-order-lines", orderLinesBody)
        let order_lines_data = order_lines.data.data
        
        order_lines_data.forEach(function(item, index){
            analysis_array.push({"sku": item.lineObjectNumber, "name": item.description})
        })

        let analysis_body = {
            items: analysis_array
        }

        const ai_response = await $axios.post("/analyzer/bulk-gpt-image-analyzer", analysis_body);
        line_item_analysys.value = ai_response.data.data

        if(line_item_analysys.value.length == 0){
            isAnalysisModalOpen.value = false
            toast.add({ title: 'Product Image not found, Please upload it in the catalog!' })
        }

        isAnalysing.value = false
    }
</script>

<template>
    <UDashboardPage>
        <UDashboardPanel grow>
            <UDashboardNavbar title="Sales Orders">
                <!-- Add items here -->
            </UDashboardNavbar>

            <UDashboardPanelContent>
                <UDashboardCard
                    title="Sales Orders"
                    :description="`Analyze pallets for each sales orders`"
                    icon="i-heroicons-queue-list">
                    <div class="w-full flex items-center mb-4">
                        <form @submit.prevent="searchItem" class="flex w-full">
                            <UInput
                                icon="i-heroicons-magnifying-glass-20-solid"
                                size="lg"
                                color="white"
                                :trailing="false"
                                placeholder="Search via order number..."
                                :disabled="isLoading"
                                class="flex-1"
                                v-model="search"
                                @input="handleInput"
                            />
                            <button 
                                type="submit" 
                                :disabled="isLoading"
                                class="ml-2 px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded">
                                Submit
                            </button>
                        </form>
                    </div>
                <UProgress class="mt-4 mb-4" v-if="isSearching" />

                    <!-- Show loader when isLoading is true -->
                    <div v-if="isLoading" class="loader-container">
                        <Loader /> 
                    </div>

                    <template v-if="!isLoading">
                        <div class="space-y-2 mt-2 mb-4" v-for="salesOrder in salesOrders" :key="salesOrder.number">
                            <UCard class="product-card">
                                <!-- Flex container -->
                                <div class="product-card-content">
                                    <!-- Details on the left -->
                                    <div class="product-details">
                                        <p>{{ salesOrder?.number }}</p>
                                        <p>
                                            <small>({{ salesOrder?.customerName }})</small>
                                        </p>
                                        <UDivider class="mb-2 mt-2" />
                                        <p>{{ salesOrder?.shipToName }}</p>
                                        <p>
                                            <small>{{ salesOrder?.shipToAddressLine1 }}, {{ salesOrder?.shipToCity }}, {{ salesOrder?.shipToState }}, {{ salesOrder?.shipToPostCode }}</small>
                                        </p>
                                    </div>
                                    <!-- Button on the right -->
                                    <div class="product-action">
                                        <UButton :data-number="salesOrder?.number" @click="analyzeItems" icon="i-heroicons-document-magnifying-glass"></UButton>
                                    </div>
                                </div>
                            </UCard>
                        </div>
                    </template>
                </UDashboardCard>

                <UModal v-model="isAnalysisModalOpen" class="m-2">
                <div class="p-4 h-48" v-if="isAnalysing">
                    <div v-if="isAnalysing" class="loader-container">
                        <Loader />
                    </div>
                </div>
                <div class="p-4" v-else>
                    <template v-for="(item, index) in line_item_analysys">
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
                        <template v-if="index+1 < line_item_analysys.length">
                            <br>
                            <UDivider label="Analysis" />
                            <br>
                        </template>
                    </template>
                </div>
            </UModal>
            </UDashboardPanelContent>
        </UDashboardPanel>
    </UDashboardPage>
</template>
