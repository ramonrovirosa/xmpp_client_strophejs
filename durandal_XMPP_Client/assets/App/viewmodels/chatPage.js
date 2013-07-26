define(function (require) {

    var app = require('durandal/app');
    var BOSH_SERVICE = 'http://localhost:5280/http-bind';
    var connection = new Strophe.Connection(BOSH_SERVICE);

    return function Chat() {

        var self = this;



        self.connectButtonText = ko.observable("Connect");
        self.jid = ko.observable("ramon.rovirosa@gmail.com");
        self.pass = ko.observable();

        self.messageText = ko.observable("Send Message");
        self.messageTo   = ko.observable();
        self.mBox = ko.observable();
        self.priority = ko.observable();

        self.connect = function() {
            if (self.connectButtonText() == 'Connect') {
                self.connectButtonText('Disconnect');
                connection.connect(self.jid(), self.pass(),
                    onConnect);
            } else {
                self.connectButtonText('Connect');
                //button.value = 'connect';
                connection.flush();
                connection.disconnect();
            }
        };

        //send a message to another user.
        self.sendMessage = function(){
            alert(self.priority());
            var message = {
                to :  self.messageTo(),
                message : self.mBox()
            }
            if(connection.jid){
                if(message.to && message.message) {
                    sendMessage(message);
                }
                else
                    alert("No message body/email specified")
            }

            else
                alert('Not connected, sorry cant send message!!!');
        };



        displayName: 'Chat Client'

    };

    function log(msg)
    {
        $('#log').append('<div></div>').append(document.createTextNode(msg));
    }

    function onConnect(status)
    {
        if (status == Strophe.Status.CONNECTING) {
            log('Strophe is connecting.');
        } else if (status == Strophe.Status.CONNFAIL) {
            log('Strophe failed to connect.');
            $('#connect').get(0).value = 'connect';
        } else if (status == Strophe.Status.DISCONNECTING) {
            log('Strophe is disconnecting.');
        } else if (status == Strophe.Status.DISCONNECTED) {
            log('Strophe is disconnected.');
            $('#connect').get(0).value = 'connect';
        } else if (status == Strophe.Status.CONNECTED) {
            log('Strophe is connected.');
            log('Get Roster for: ' + connection.jid );
            //        connection.send($pres().tree());
            //sendPriority();
            getRoster();
            connection.addHandler(onMessage, null, 'message', null, null,  null);
            //connection.addHandler(getRoster, null, 'roster');

        }
    }

    function getRoster() {
        var iq = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'});
        //var iq2= $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster:presence'});
        //log("Requesting roster " + iq.toString());
        connection.sendIQ(iq, rosterReceived);
        //connection.sendIQ(iq2, received2);
    }

    function rosterReceived(iq){
        //log("\nReceived roster" + Strophe.serialize(iq) + '\n');
        //$("#roster").empty();

        //connection.send($pres());
        //console.log(iq);

        log("...Contacts for " + connection.jid + ': \n');
        $(iq).find("item").each(function() {
            // if a contact is still pending subscription then do not show it in the list
            if ($(this).attr('ask')) {
                return true;
            }
            console.log(this);
            log('Name: ' + $(this).attr('name') + ', jid: ' +$(this).attr('jid')  +'\n');
        });

        //connection.send($pres().tree());
        connection.addHandler(on_presence,null,"presence");
        log('...Getting online availability/presence (available,unavailable, etc...)');

    }

    function on_presence(presence){
        var presence_type = $(presence).attr('type'); // unavailable, subscribed, etc...
        var from = $(presence).attr('from'); // the jabber_id of the contact...

        //log('presence message from: ' + from);
        console.log(presence);
        //console.log("From: " + from);
        //console.log("type: " + presence_type);
        if (presence_type != 'error'){
            if (presence_type === 'unavailable'){
                log(from + " is unavailable to chat");

            }else{
                var show = $(presence).find("show").text(); // this is what gives away, dnd, etc.
                if (show === 'chat' || show === ''){
                    // Mark contact as online
                    log(from + ' is available to chat');
                } if (show === 'away'){
                    log(from + ' is away');
                }
                else{
                    log(from + ' ...no presence type received, user is online');
                }
            }
        }
        return true;

//
//        console.log(presence);
//        return true;
    }

    function onMessage(msg) {
        console.log(msg);
        var to = msg.getAttribute('to');
        var from = msg.getAttribute('from');
        var type = msg.getAttribute('type');
        var elems = msg.getElementsByTagName('body');



        console.log('to '+ to);
        console.log('from '+ from);

        if ( /*type == "chat" && */ elems.length > 0) {
            var body = elems[0];
            log('...I got a message from ' + from + ': ' +
                Strophe.getText(body));

        }

        // we must return true to keep the handler alive.
        // returning false would remove it after it finishes.
        return true;
    }

    function sendMessage(msg){
        var reply = $msg({to: msg.to, from: connection.jid, type: 'chat'})
            .c("body")
            .t(msg.message);
        connection.send(reply.tree());

        log('...I sent ' + msg.to + ': ' + msg.message);

    }

    function sendPriority(){
        var priority = document.getElementById("priority");
        //var selectedPriority = parseInt(priority.options[priority.selectedIndex].value);
        var selectedPriority = priority.options[priority.selectedIndex].value;
        //alert(selectedPriority);
        connection.send($pres()
            .c("priority").t(selectedPriority));
    }


});