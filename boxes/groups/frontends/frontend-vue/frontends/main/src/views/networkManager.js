export default {

    createNetwork() {
        this.networkShowMode = false;
    },

    addNetWork() {
        try {

            var data = JSON.parse(this.customnNetworkConfig);
            console.log(data);
            if (!data.endpoints) {
                alert('endpoint miss');
                return;
            }

            var keyName = this.projectType + '_custom_network';
            var inLocal = window.localStorage.getItem(keyName);

            if (inLocal) {
                inLocal = JSON.parse(inLocal);
            } else {
                inLocal = [];
            }

            console.log('inLocal', inLocal);
            var same = inLocal.filter((m) => {
                return m.key == data.key;
            });

            var curr = this.networkList.filter((m) => {
                return m.key == data.key;
            });

            if (same.length || curr.length) {
                alert('duplicate key');
                return;
            }

            inLocal.push(data);

            window.localStorage.setItem(keyName, JSON.stringify(inLocal));

            alert('add sucess, please refresh the whole web page');
        } catch (e) {
            alert(e);
        }

    }
}