/**
 * 取得facebook SDK 並初始化
 */
window.fbAsyncInit = function () {
    FB.init({
        appId: 'your-app-id',
        xfbml: true,
        version: 'v2.4'
    });
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


/**
 * @class GAME
 * 建立GAME的建構式把遊戲內容包裝在 package 裡面避免放在 global被修改
 * @param {Object} io 由socket.io.js建立的io物件
 */
var GAME = function (io) {
    var self = this;
    self.io = io;
    var socket = io.connect();
    socket.on('test', function (data) {
        console.log('recive test message', data.message);
    });

    self.login = function () {

        FB.getLoginStatus(function (response) {
            if (response.status === 'connected') {
                console.log('Logged in.');
                return;
            } else {
                FB.login(function () {}, {
                    scope: 'publish_actions'
                });
            }
        });

        function loginFBSuccess() {
            //get user data and picture reg to server 

        }
    }

};

var game = new GAME(io);