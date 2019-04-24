export default {
    initLocalConfig(){
        var localAccount = window.localStorage.getItem('localAccount');
        console.log('initLocalConfig', localAccount);
        if(localAccount){
            this.localConfig = JSON.parse(localAccount);
            this.$forceUpdate();
            console.log('initLocalConfig', this.localConfig)
        }
    },

    saveLocalConfig(){
        window.localStorage.setItem('localAccount', JSON.stringify(this.localConfig));
    }
}