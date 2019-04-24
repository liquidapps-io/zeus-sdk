export default {


    initTour() {
        var tourend = window.localStorage.getItem('tourend');
        if (!tourend && this.projectType == 'eos') {
            this.$tours['myTour'].start();
        }
    },
    tourCallbacks: {
        onStop() {
            window.localStorage.setItem('tourend', 1);

        }
    },

    steps: [{
            target: '#logo-block', // We're using document.querySelector() under the hood
            content: `Discover <strong>Zeus IDE</strong>!`
        },
        {
            target: '.dropdown-network-selector',
            content: 'Choose the network first'
        },
        {
            target: '.dropdown-user',
            content: 'and Link your scatter account'
        },
        {
            target: '#file-manager',
            content: 'manager your code',
            params: {
                placement: 'bottom'
            }
        },
        {
            target: "#deploy-code",
            content: 'compile your code and deopy to the current network'
        },

        {
            target: "#run-code",
            content: 'call your contract in the browser by write ‘.js’ code'
        },
        {
            target: '#save-project',
            content: 'save current code onchain and share it to another'
        }
    ]

}
