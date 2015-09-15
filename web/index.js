/**
 * @class GAME
 * create GAME class
 * @param {Object} io socket io object
 */
var GAME = function () {
    var self = this;
    var io = window.io;
    var FB = window.FB;
    var socket
    if (location.host === 'know-chnbohwr.rhcloud.com') {
        socket = io.connect('http://know-chnbohwr.rhcloud.com:8000')
    } else {
        socket = io.connect();
    }
    var login_status = {
        facebook: false,
        game: false
    };

    FB.init({
        appId: '1633361533588392',
        xfbml: true,
        version: 'v2.4'
    });

    self.login = function () {
        //get login status 
        FB.getLoginStatus(function (response) {
            if (response.status === 'connected') {
                //already login . do nothing
                console.log('facebook login success.');
                loginFBSuccess.facebook = true;
                loginFBSuccess();
                return;
            } else {
                //login facebook get permission
                FB.login(loginFBSuccess, {
                    scope: 'public_profile,email,user_friends'
                });
            }
        });

        /**
         * loginFBsccess
         * download profile and friend list to server
         */
        function loginFBSuccess() {
            //success login facebook
            //get user data, get user friends
            FB.api('/me', function (response) {
                if (response && !response.error) {
                    self.user_profile = response;
                    //use socket id to login socket.io
                    socket.emit('login', response);
                }
            });

            FB.api("/me/friends", function (response) {
                if (response && !response.error) {
                    self.user_friends = response.data;
                }
            });

            FB.api("/me/picture", function (response) {
                if (response && !response.error) {
                    self.user_picture = response.data.url;
                }
            });
        }

    }; //end self.login

    /**
     * @function getLoginStatus
     * get facebook and game login status
     * @returns {[[Type]]} [[Description]]
     */
    self.getLoginStatus = function () {
        return login_status;
    };

    /**
     * @function sendMessage
     * send chat message by socket.io
     * @param {[[Type]]} message [[Description]]
     */
    function sendMessage(message) {
        socket.emit('chat', {
            message: message
        });
    }

    /**
     * @function receiveMessage
     * get chat message from socket.io
     * @param {Object} data socket.io data
     */
    function receiveMessage(data) {
        console.log(data.name + ': ' + data.message, data.datetime);
    }

    /**
     * @function answerQuestion
     * input ansewr data to server 
     * @param {Number} ans which answer 
     */
    function answerQuestion(ans) {
        socket.emit('ans', {
            ans: ans
        });
    }

    /**
     * @function receiveOnlineUsers
     * receive online user list in data.data
     * @param {Object} data userdata
     */
    function receiveOnlineUsers(data) {
        self.online_users = data.data;
    };

    /**
     * @function loginSuccess
     * when login succes
     */
    function loginSuccess() {
        console.log('game login success');
        login_status.game = true;
        //open function in game class
        self.chat = sendMessage;
    }

    /**
     * @function loginError
     * when login error
     * @param {Object} data data.message = error message
     */
    function loginError(data) {
        console.log('game login error', data.message, data.code);
    }

    /**
     * @function userLogin
     * when user log in push user data into array
     * @param {[[Type]]} data [[Description]]
     */
    function userLogin(data) {
        if (self.online_users) {
            self.online_users.push(data);
        }
    }

    /**
     * @function userLogout
     * when user logout remove user data from array
     * @param {Object} data [[Description]]
     */
    function userLogout(data) {
        if (self.online_users) {
            for (var i in self.online_users) {
                if (self.online_users[i].id === data.id) {
                    self.online_users.splice(i, 1);
                    break;
                }
            }
        }
    }

    function receiveQuestion(data) {
        console.log('question:' + data.q);
        for (var i = 1; i < 5; i++) {
            console.log(i + '. ' + data.o[i - 1]);
        }
    }

    function receiveAnswer(data) {
        console.log('answer:' + (data.a + 1) + '. ' + data.t);
    }

    socket.on('chat', receiveMessage);
    socket.on('onlineUsers', receiveOnlineUsers);
    socket.on('loginSuccess', loginSuccess);
    socket.on('loginError', loginError);
    socket.on('userLogin', userLogin);
    socket.on('userLogout', userLogout);
    socket.on('question', receiveQuestion);
    socket.on('answer', receiveAnswer);
};

/**
 * get facebook sdk
 */
window.fbAsyncInit = function () {
    window.game = new GAME();
};

(function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
        return;
    }
    js = d.createElement(s);
    js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));