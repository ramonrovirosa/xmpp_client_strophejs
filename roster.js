
    //var BOSH_SERVICE = '/xmpp-httpbind';
    var BOSH_SERVICE = 'http://localhost:5280/http-bind';
    var connection = null;
    var viewModel = new contactsModel(); //viewModel

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
            sendPriority();
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
            //log('Name: ' + $(this).attr('name') + ', jid: ' + $(this).attr('jid')  +'\n');
            viewModel.pushArray($(this).attr('jid'));
            //viewModel.contacts().push(new contact($(this).attr('jid')));


        });

        //connection.send($pres().tree());

        console.log(viewModel.contacts());
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
                //log(from + " is offline (unavailable)");

            }else{
                var show = $(presence).find("show").text(); // this is what gives away, dnd, etc.
                if (show === 'chat' || show === ''){
                    // Mark contact as online
                    //log(from + ' priority is ' + $(presence).find("priority").text()+ "...available to chat" );
                    console.log("someone is online: " + from);
                    viewModel.getOnlineStatus($(presence).attr('from'));

                } else if (show === 'away'){
                   //log(from + ' is away');
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


    $(document).ready(function () {
        connection = new Strophe.Connection(BOSH_SERVICE);

        // Uncomment the following lines to spy on the wire traffic.
        //connection.rawInput = function (data) { log('RECV: ' + data); };
        //connection.rawOutput = function (data) { log('SEND: ' + data); };

        // Uncomment the following line to see all the debug output.
        //Strophe.log = function (level, msg) { log('LOG: ' + msg); };


        $('#connect').bind('click', function () {
            var button = $('#connect').get(0);
            if (button.value == 'connect') {
                button.value = 'disconnect';

                connection.connect($('#jid').get(0).value,
                           $('#pass').get(0).value,
                           onConnect);
            } else {
                button.value = 'connect';
                viewModel.removeArray();
                connection.flush();
                connection.disconnect();
            }
        });

        //send a message to another user.
        $('#sendMessage').bind('click', function(){
            var message = {
                to :  $('#messageTo').val(),
                message : $('#messagBox').val()
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

//            contactsModel.showContacts(true);
        });


        //apply model bindings
        ko.applyBindings(viewModel);
    });


    function contact(name){
        var self = this;
        self.name = name;
        self.status=ko.observable("Offline");
        //self.availability = ko.observable();
    }

    function contactsModel(){
        var self=this;

        self.showContacts=ko.observable(false);
        self.contactHeader=ko.observable("Contacts");
        self.contacts = ko.observableArray([

        ]);
        self.getContacts= function(){
                //$("#contacts h2").replaceWith("<h2>Contacts</h2>");
                self.showContacts(!self.showContacts());

        }
        self.pushArray=function(name){
            self.contacts.push(new contact(name));
        }
        self.removeArray=function(){
             self.contacts.removeAll();
        }
        self.getOnlineStatus=function(from){

            ko.utils.arrayForEach(self.contacts(), function(item){
                if(from.match(item.name)) {
                    console.log(item)
                    item.status("Online...available to chat!");
                }
            });

//            for(var i=0;i<self.contacts().length;i++){
//                  console.log(self.contacts()[i].name)
//                 //if(jid.match(self.contacts()[i].name))
//            }
        }

    }
