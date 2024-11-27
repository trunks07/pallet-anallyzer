<template>
    <div class="loader">
        <div class="spinner"></div>
        </div>
    </template>
    
    <style scoped>
    .loader {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
    }
    
    .spinner {
        border: 4px solid transparent;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 100%;
        height: 100%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>