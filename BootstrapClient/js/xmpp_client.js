var BOSH_SERVICE = 'http://localhost:5280/http-bind';
var connection = null;
var viewModel = new contactsModel(); //viewModel

function onConnect(status)
{
    if (status == Strophe.Status.CONNECTING) {
        console.log('Strophe is connecting.');
    } else if (status == Strophe.Status.CONNFAIL) {
        console.log('Strophe failed to connect.');
        $('#connect').get(0).value = 'connect';
    } else if (status == Strophe.Status.DISCONNECTING) {
        console.log('Strophe is disconnecting.');
    } else if (status == Strophe.Status.DISCONNECTED) {
        console.log('Strophe is disconnected.');
        $('#connect').get(0).value = 'connect';
    } else if (status == Strophe.Status.CONNECTED) {
        console.log('Strophe is connected.');
        viewModel.isConnected();
        console.log('Get Roster for: ' + connection.jid );
        //        connection.send($pres().tree());
        sendPriority();
//        getRoster();
//        connection.addHandler(onMessage, null, 'message', null, null,  null);

    }
}

function sendPriority(){
    var priority = $('#priority').get(0).value;
    //var selectedPriority = parseInt(priority.options[priority.selectedIndex].value);
    connection.send($pres()
        .c("priority").t(priority));
}

$(document).ready(function(){
    connection = new Strophe.Connection(BOSH_SERVICE);
    ko.applyBindings(viewModel);
});

function contactsModel(){
     var self = this;
     self.connected=ko.observable(false);

    self.connect = function(){
        var button = $('#connect').get(0);
        if (button.value == 'Connect') {
            button.value = 'Disconnect';

            connection.connect($('#jid').get(0).value,
                $('#pass').get(0).value,
                onConnect);
        } else {
            button.value = 'Connect';
            //viewModel.removeArray();
            connection.flush();
            connection.disconnect();
        }
    }
    self.isConnected = function(){
        self.connected(true);
    }
}