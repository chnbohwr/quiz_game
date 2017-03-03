/**
 * @class GAME
 * create GAME class
 * @param {Object} io socket io object
 */
var GAME = function () {
    var self = this;
    var io = window.io;
    var FB = window.FB;
    var socket, now_quiz, myanswer,online_users;
    //回答的人
    var answer_user = [];

    //look if the location is product or developement
    if (location.host === 'know-chnbohwr.rhcloud.com') {
        socket = io.connect('http://know-chnbohwr.rhcloud.com:8000')
    } else {
        socket = io.connect();
    }

    //make login status object
    var login_status = {
        facebook: false,
        game: false
    };

    //initial facebook
    FB.init({
        appId: '1633361533588392',
        xfbml: true,
        version: 'v2.4'
    });

    //login facebook in game
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

    }; //end self.login

    /**
     * @function getLoginStatus
     * get facebook and game login status
     * @returns {[[Type]]} [[Description]]
     */
    self.getLoginStatus = function () {
        return login_status;
    };
    
    self.getOnlineUsers = function(){
        console.log(online_users);
    };

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
                FB.api("/me/picture", function (r) {
                    if (r && !r.error) {
                        response.avatar = r.data.url;
                        //use socket id to login socket.io
                        socket.emit('login', response);
                    }
                });
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
     * @function receiveOnlineUsers
     * receive online user list in data.data
     * @param {Object} data userdata
     */
    function receiveOnlineUsers(data) {
        online_users = data;
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
        self.answer = answer;
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
        console.log('玩家: ' + data.name + ' 登入遊戲');
        if (online_users) {
            online_users.push(data);
        }
    }

    /**
     * @function userLogout
     * when user logout remove user data from array
     * @param {Object} data [[Description]]
     */
    function userLogout(data) {
        if (online_users) {
            for (var i in online_users) {
                if (online_users[i].id === data.facebook_id) {
                    console.log('玩家: ' + online_users[i].name + ' 離開遊戲');
                    online_users.splice(i, 1);
                    break;
                }
            }
        }
    }

    /**
     * @function receiveQuestion
     * get question by server 
     * @param {Object} data [[Description]]
     */
    function receiveQuestion(data) {
        console.log('question:' + data.q);
        now_quiz = data;
        for (var i = 1; i < 5; i++) {
            console.log(i + '. ' + data.o[i - 1]);
        }
    }

    /**
     * @function receiveAnswer
     * get answer by server 
     * @param {Object} data [[Description]]
     */
    function receiveAnswer(data) {

        console.log('正確解答:' + data.a);

        //計算所有人成績
        for (var i in answer_user) {
            var ans_object = answer_user[i];
            if (ans_object.answer === data.a) {
                var user = getUserData(ans_object.facebook_id);
                user.score += 1;
            }
        }

        if (myanswer === data.a) {
            console.log('答對了');
        }

        //clear data
        myanswer = undefined;
        now_quiz = undefined;
        answer_user = [];
    }


    /**
     * @function answer
     * 回答問題
     * @param {Number} number 選擇正確的題號
     */
    function answer(number) {
        if (!now_quiz) {
            console.log('現在不是回答時間')
            return;
        }

        //放到變數 myanswer
        myanswer = number;
        var data = {
            uuid: now_quiz.uuid,
            answer: number
        }
        socket.emit('selectAnswer', data);
    }

    /**
     * @function userSelectAnswer
     * 線上的使用者選擇答案
     * @param {Object} data data.facebook_id,data.answer
     */
    function userSelectAnswer(data) {
        answer_user.push(data);
        var user = getUserData(data.facebook_id);
        console.log(user.name + '選擇答案:' + data.answer);
    }

    /**
     * @function getUserData
     * facebook_id 找到使用者的資料
     * @param   {String} facebook_id 
     * @returns {Object} user data
     */
    function getUserData(facebook_id) {
        for (var i in online_users) {
            if (online_users[i].id === facebook_id) {
                return online_users[i];
            }
        }
    }

    socket.on('chat', receiveMessage);
    socket.on('onlineUsers', receiveOnlineUsers);
    socket.on('loginSuccess', loginSuccess);
    socket.on('loginError', loginError);
    socket.on('userLogin', userLogin);
    socket.on('userLogout', userLogout);
    socket.on('server_question', receiveQuestion);
    socket.on('server_answer', receiveAnswer);
    socket.on('userSelectAnswer', userSelectAnswer);
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