var BOSH_SERVICE = 'http://localhost:5280/http-bind';
var connection = null;
var viewModel = new contactsModel(); //viewModel

function onConnect(status)
{
    if (status == Strophe.Status.CONNECTING) {
        console.log('Strophe is connecting.');
        viewModel.connectDialog('connecting');
    } else if (status == Strophe.Status.CONNFAIL) {
        console.log('Strophe failed to connect.');
        viewModel.connectDialog('failed')
    } else if (status == Strophe.Status.DISCONNECTING) {
        console.log('Strophe is disconnecting.');
    } else if (status == Strophe.Status.DISCONNECTED) {
        console.log('Strophe is disconnected.');
    } else if (status == Strophe.Status.CONNECTED) {
        console.log('Strophe is connected.');
        viewModel.connectDialog('connected');
        console.log('Get Roster for: ' + connection.jid );
        sendPriority();
        getRoster();
        connection.addHandler(onMessage, null, 'message', null, null,  null);
    }
}

function sendPriority(){
    var priority = $('#priority').get(0).value;
    //var selectedPriority = parseInt(priority.options[priority.selectedIndex].value);
    connection.send($pres()
        .c("priority").t(priority));
}

function getRoster() {
    var iq = $iq({type: 'get'}).c('query', {xmlns: 'jabber:iq:roster'});
    connection.sendIQ(iq, rosterReceived);
}

function rosterReceived(iq){
    console.log("...Contacts for " + connection.jid + ': \n');
    console.log(iq);
    $(iq).find("item").each(function() {
        // if a contact is still pending subscription then do not show it in the list
        if ($(this).attr('ask')) {
            return true;
        }
        console.log(this);
        viewModel.addContacts($(this).attr('name'), $(this).attr('jid'));
    });
    console.log(viewModel.contacts());

    connection.addHandler(on_presence,null,"presence");
}

function on_presence(presence){
    var presence_type = $(presence).attr('type'); // unavailable, subscribed, etc...
    var from = $(presence).attr('from'); // the jabber_id of the contact...

    console.log(presence);
    if (presence_type != 'error'){
        if (presence_type === 'unavailable'){
            //log(from + " is offline (unavailable)");
            viewModel.setOfflineStatus($(presence).attr('from'));
        }else{
            var show = $(presence).find("show").text(); // this is what gives away, dnd, etc.
            if (show === 'chat' || show === ''){
                // Mark contact as online
                //log(from + ' priority is ' + $(presence).find("priority").text()+ "...available to chat" );
                console.log("someone is online: " + from);
                viewModel.setOnlineStatus($(presence).attr('from'));

            } else if (show === 'away'){
                //log(from + ' is away');
            }
        }
    }
    return true;
}
function sendMessage(msg){
    var reply = $msg({to: msg.to, from: connection.jid, type: 'chat'})
        .c("body")
        .t(msg.message);
    connection.send(reply.tree());
    console.log('...I sent ' + msg.to + ': ' + msg.message);
}
function onMessage(msg) {
    console.log(msg);

    var to = msg.getAttribute('to');
    var from = msg.getAttribute('from');
    var type = msg.getAttribute('type');
    var elems = msg.getElementsByTagName('body');

    if(type == "error"){
        alert("An error occured! Is your account verified? Is the individual in your contacts?");
        return;
    }

    if (/*type == "chat" && */ elems.length > 0) {
        var body = elems[0];
        console.log('...I got a message from ' + from + ': ' +
            Strophe.getText(body));


        var message = {
            from: from,
            body: Strophe.getText(elems[0])
        }

        viewModel.messageReceived(message);
    }

    if ($(msg).attr('from') == 'pubsub.localhost') {
        var _data = $(msg).children('event')
            .children('items')
            .children('item')
            .children('entry').text();
        var _message = _data.toString();
        var subMessage = {
            from: viewModel.subscribeNode(),
            body: _message
        }
        viewModel.subscribeMessageReceived(subMessage);
    }


    // we must return true to keep the handler alive.
    // returning false would remove it after it finishes.
    return true;
}

function createNode(){
    connection.send($pres());
//    var msg = {
//        from : viewModel.subscribeNode(),
//        message    : viewModel.publishText(),
//        type :    'msg_text'
//    }
    sendPub();
}

function getSubJid(JID){
    //for parsing JID: ramon@localhost/1234567
    // to ramon@localhost
    var subJID='';
    for(i=0;i<JID.length;i++){
        if(JID[i] == '/')
            return subJID;
        subJID+=JID[i];
    }
    return subJID;
}

function sendPub(){
    if(viewModel.publishText() == ''){
        viewModel.createNode();
        return;
    }

    console.log("sending data");
//    connection.pubsub.publish(
//        connection.jid,
//        'pubsub.localhost',
//        viewModel.publishNode(),
//        [viewModel.publishText().toString()],
//        publish.onSend
//    );
    connection.pubsub.publish(
        viewModel.publishNode(),
        viewModel.publishText(),
        publish.onSend
    );
     //viewModel.messagePublished(msg);
}
function onSubscribe(){
    console.log("client subscribed!");
    viewModel.subscribe();
    console.log("now waiting for messages!");
    return true;
}
function onEvent(message){
    if(!viewModel.clientSubscribed()){
        return true;
    }
    return true;
}

$(document).ready(function(){
    connection = new Strophe.Connection(BOSH_SERVICE);
    ko.applyBindings(viewModel);
});

function contactsModel(){
    var self = this;
    self.jid=ko.observable();
    self.password=ko.observable();
    self.connecting=ko.observable(false);
    self.firstMessageSent=ko.observable(false);
    self.firstMessageReceived=ko.observable(false);
    self.connectText=ko.observable('Connecting...');
    self.contacts = ko.observableArray([]);
    self.sentMessages=ko.observableArray([]);
    self.receivedMessages=ko.observableArray([]);
    self.subscribedMessages=ko.observableArray([]);
    self.publishedMessage=ko.observableArray([]);
    self.subscribedNode = ko.observableArray([]);
    self.sendUsername=ko.observable();
    self.sendMessageText=ko.observable();
    self.publishNode=ko.observable();
    self.nodeCreated=ko.observable(false);
    self.publishText=ko.observable('');
    self.subscribeNode=ko.observable();
    self.unsubscribeNode=ko.observable();
    self.clientSubscribed=ko.observable(false);
    self.pubButton=ko.observable("Create Node");
    self.SUBID=ko.observable('');
    self.subscriptionTable=ko.observable(false);


    self.connect = function(){
        var button = $('#connect').get(0);
        if (button.value == 'Connect') {
            button.value = 'Disconnect';

            connection.connect(self.jid(),
                self.password(),
                onConnect);
        } else {
            button.value = 'Connect';
            //viewModel.removeArray();
            self.connecting(false);
            self.firstMessageSent(false);
            self.firstMessageReceived(false);
            connection.flush();
            connection.disconnect();
            viewModel.removeArray();
            viewModel.removeText();
        }
    }
    self.connectDialog = function(status){
        self.connecting(true);
        if(status=='connecting')
            self.connectText('Connecting...');
        if(status=='connected')
            self.connectText('Connected!');
        if(status=='failed'){
            self.connectText('Failed to connect');
        }
    }
    self.addContacts=function(name,jid){
        self.contacts.push(new contact(name,jid));
    }
    self.removeArray=function(){
        self.contacts.removeAll();
        self.sentMessages.removeAll();
        self.subscribedMessages.removeAll();
        self.publishedMessage.removeAll();
    }
    self.removeText=function(){
        self.publishNode('');
        self.publishText('');
        self.subscribeNode('');
    }
    self.setOfflineStatus=function(from){
        ko.utils.arrayForEach(self.contacts(), function(item){
            if(from.match(item.jid)) { //user
                console.log("going offline");
                console.log(from);
                console.log(item)
                //online user goes offline.
                if(item.from != '' && item.from == from){
                    item.status("Offline");
                    console.log("Online user just went offline...")
                }
            }
        });

    }
    self.setOnlineStatus=function(from){
        //connection.send($pres());
        ko.utils.arrayForEach(self.contacts(), function(item){
            if(from.match(item.jid)) {
                item.from = from;
                console.log(item)
                if(item.status() != "Online...available to chat!"){
                    item.status("Online...available to chat!");
                    console.log("sending Presence!")
                    connection.send($pres());
                }
            }
        });
    }
    self.sendMessage = function(){
        if(self.sendUsername() == undefined || self.sendUsername() == '')
            alert("Blank Username, please fix");
        else if(self.sendMessageText() == undefined || self.sendMessageText() == '' )
            alert("Empty Message, please type something");
        else{
            var message = {
                to :  self.sendUsername(),
                message : self.sendMessageText()
            }
            self.firstMessageSent(true);
            self.sentMessages.push(message);
            sendMessage(message);
        }
    }
    self.messageReceived=function(message){
        self.firstMessageReceived(true);
        self.receivedMessages.push(message);

    }
    self.publishMessage=function(){
        if(self.publishNode() == undefined || self.publishNode() == '')
            alert("Blank Node name, please fix");
//        else if(self.publishText() == undefined || self.publishText() == '' )
//            alert("Empty Message, please type something");
        else{
            console.log("creating pubSub node: "+ self.publishNode());
            connection.pubsub.createNode(
                self.publishNode(),
                {},
                publish.onCreateNode
            );
        }
    }
    self.pubSubscribe=function(){
        connection.pubsub.subscribe(
            self.subscribeNode(),
            {},
            onEvent(),
            onSubscribe(),
            console.log("error subscribing to node"),
            connection.jid
        );
    }
    self.subscribe=function(){
        self.clientSubscribed(true);
    }
    self.subscribeMessageReceived = function(msg){
         self.subscribedMessages.push(msg);
    }
    self.messagePublished=function(msg){
             self.publishedMessage.push(msg);

    }
    self.createNode=function(){
        self.nodeCreated(true);
        self.pubButton('Send Node Message');
    }
    self.pubUnsubscribe = function(){
        //we must call getSubscription in order
        //to get the subID first before we unsubscribe...
        connection.pubsub.getSubscriptions(publish.getSubscriptionsForUnsubscribe);
    }
    self.getSUBID  = function(subID){
        self.SUBID(subID);
        console.log("SUBID: ", self.SUBID());
        self.unsubscribe();

    }
    self.unsubscribe= function(){
        connection.pubsub.unsubscribe(
            // unsubscribe: function(node, jid, subid, success, error)
            self.unsubscribeNode(),
            getSubJid(connection.jid),
            self.SUBID(),
            publish.unsubscribeSuccess,
            publish.unsubscribeError
        );
    }
    self.showSubscriptions = function(){
        connection.pubsub.getSubscriptions(publish.getSubscriptions);
    }
    self.pushsubscribedNode = function(node){
        //console.log(node);
        self.subscriptionTable(true);
        self.subscribedNode.push({nodeName : node});
    }
}

function contact(name,jid){
    var self  = this;
    self.name = name;
    self.jid  = jid;
    self.status=ko.observable("Offline");
    self.from = '';
    //self.availability = ko.observable();
}

var publish = {
    onCreateNode : function(data){
        console.log("Data: ");
        console.log(data);
        createNode();
    },
    onSend: function (data) {
        console.log("Data Sent");
        console.log(data);
        viewModel.messagePublished({from: viewModel.publishNode(),body: viewModel.publishText() })
        return true;
    },
    unsubscribeSuccess : function(data){
        alert("Successfull unsubscribe from node: " + viewModel.unsubscribeNode());
        console.log("Unsubscribed: "  + viewModel.unsubscribeNode(), data);
    },
    unsubscribeError : function(data){
        alert("Error unsubscribing");
        console.log("Error unsubscribing " + viewModel.unsubscribeNode(),data);
    },
    getSubscriptionsForUnsubscribe : function(iq){
        console.log("iq",iq);
        $(iq).find('subscription').each(function() {
              console.log($(this).attr('node'));
              if($(this).attr('node') == viewModel.unsubscribeNode()) {
                  viewModel.getSUBID($(this).attr("subid"));
                  //console.log("subid: ", $(this).attr("subid"));
              }
        });
    },
    getSubscriptions : function(iq){
        console.log("iq",iq);
        $(iq).find('subscription').each(function() {
           viewModel.pushsubscribedNode($(this).attr('node'));
        });
    }
}
