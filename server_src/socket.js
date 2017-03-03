var uuid = require('node-uuid');
var fs = require('fs');
var quiz = JSON.parse(fs.readFileSync('quiz.json', 'utf-8'));
var quiz_length = quiz.length;
var now_quiz;


//quiz waitting for answer time
var quiz_time = 20;

//quiz over, waitting for next quiz time
var next_quiz_time = 10;

//線上的 socket 列表
var online_socket = [];

//登入facebook 以後把socket 物件 push 進去 array
var online_user = [];

//當前回答問題的使用者 facebook_id
var answer_user = [];

/**
 * @class SocketConnection
 * @param {Object} io require io and create server by express 
 */
module.exports = function (io) {

    //when connect 
    io.on('connection', function (socket) {
        //把 socket 放到 online_socket 列表裡面
        online_socket.push(socket);
        //當使用者連線以後先給予目前的線上使用者跟目前問題 
        sendOnlineUsers();
        sendNowQuestion();

        //receive disconnection data 
        socket.on('disconnect', function () {

            //splice socket from online_socket
            for (i in online_socket) {
                if (online_socket[i].id === socket.id) {
                    online_socket.splice(i, 1);
                    break;
                }
            }

            //delete facebook id when logout 
            if (socket.facebook_id) {

                //告訴全體人員有人登出遊戲
                io.emit('userLogout', {
                    facebook_id: socket.facebook_id
                });

                //找到 facebook 帳號踢出列表
                for (var j in online_user) {
                    if (socket.facebook_id === online_user[j].id) {
                        online_user.splice(j, 1);
                        break;
                    }
                }
            }
        });

        //receive login data 
        socket.on('login', function (data) {
            //找看看有沒有重複登入
            var has_login = false;
            for (var i in online_user) {
                if (data.id === online_user[i].id) {
                    has_login = true;
                    break;
                }
            }

            if (has_login === false) {
                //先初始化的分數跟最高分
                data.score = 0;
                data.high_score = 0;
                //把facebook 資訊放到 socket 裡面
                data.socket_id = socket.id;
                socket.facebook_id = data.id;
                //把使用者放的 online_user 裡面
                online_user.push(data);
                //告訴自己登入成功
                socket.emit('loginSuccess');
                //告訴大家有使用者登入
                io.emit('userLogin', data);
            } else {
                //send login error message
                socket.emit('loginError', {
                    code: 0,
                    message: 'has logined on other platform'
                });
            }

        });

        //receive chat data 
        socket.on('chat', function (data) {
            data.datetime = new Date();
            data.name = findFacebookUser(socket.id).name;
            io.emit('chat', data);
        });

        
        /**
         * data.uuid now_quiz.uuid
         * data.answer , user select answer 
         */
        socket.on('selectAnswer', function (data) {
            
            //如果現在沒有題目正在執行就跳出
            if(!now_quiz){
                return;
            }
            
            //檢查題目的 uuid 有沒有正確
            if(now_quiz.uuid !== data.uuid){
                return;
            }

            //如果回答過問題就不能再回答了
            var index = answer_user.indexOf(socket.facebook_id);
            if (index > -1) {
                return;
            }

            //caculate user score
            if (data.answer === now_quiz.a) {
                var user = findFacebookUser(socket.facebook_id);
                user.score += 1;
            }
            
            //告訴大家他選了什麼答案
            io.emit('userSelectAnswer', {
                facebook_id: socket.facebook_id,
                answer: data.answer
            });
        })


        //todo fix it 
        function sendOnlineUsers() {
            //send online user list
            socket.emit('onlineUsers', online_user);
        }

        function sendNowQuestion() {
            //console.log(now_quiz);
            if (!now_quiz) {
                return;
            }
            //send question to user
            var send_data = {
                q: now_quiz.q,
                o: now_quiz.o,
                deadline: now_quiz.deadline,
                uuid:now_quiz.uuid
            }
            socket.emit('server_question', send_data);
        }


    }); // end io.on connection

    function askQuestion() {
        //random question
        now_quiz = quiz[parseInt(Math.random() * quiz.length)];
        //random answer(1,2,3,4)
        now_quiz.a = parseInt(Math.random() * 4) + 1 ;
        //打散陣列重新組合成配合答案的選項陣列
        for (var i = 0; i < now_quiz.a-1; i++) {
            now_quiz.o.unshift(now_quiz.o.pop());
        }

        //設定問題結束時間
        var now_time = new Date();
        var next_time = now_time.setSeconds(now_time.getSeconds() + quiz_time);
        now_quiz.deadline = next_time;

        //產生問題的 uuid 
        now_quiz.uuid = uuid.v4();

        //console.log(now_quiz);
        var send_data = {
            q: now_quiz.q,
            o: now_quiz.o,
            deadline: now_quiz.deadline,
            uuid: now_quiz.uuid
        };

        //發送問題給每個使用者
        io.emit('server_question', send_data);

        //設定時間給解答
        setTimeout(giveAnswer, quiz_time * 1000);
    }

    //給解答
    function giveAnswer() {

        io.emit('server_answer', {
            a: now_quiz.a
        });

        //todo clear now_quiz
        now_quiz = undefined;
        
        //clear answer user
        answer_user = [];

        //set timeout to broadcast next question
        setTimeout(askQuestion, next_quiz_time * 1000);
    }

    function findFacebookUser(socket_id) {
        for (var i in online_user) {
            if (online_user[i].socket_id === socket_id) {
                return online_user[i];
            }
        }

        return {
            id: 0,
            name: '未知用戶'
        };
    }

    askQuestion();
};