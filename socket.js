/**
 * @class SocketConnection
 * @param {Object} io require io and create server by express 
 */
module.exports = function (io) {
    var online_user = {}
        //online user who is login in facbook
    var online_user_fb_id = [];

    //when connect 
    io.on('connection', function (socket) {
        console.log('socket connect', socket.id);
        online_user[socket.id] = socket;
        sendOnlineUsers();
        
        //receive disconnection data 
        socket.on('disconnect', function () {
            console.log('Got disconnect!', socket.id);
            delete online_user[socket.id];

            //delete facebook id when logout 
            if (socket.fb_user) {
                io.emit('userLogout',socket.fb_user);
                var index = online_user_fb_id.indexOf(socket.fb_user.id);
                if (index > -1) {
                    online_user_fb_id.splice(index, 1);
                }
            }
        });

        //receive login data 
        socket.on('login', function (data) {
            //找看看有沒有重複登入
            var fb_index = online_user_fb_id.indexOf(data.id);
            if (fb_index === -1) {
                socket.fb_user = data;
                online_user_fb_id.push(data.id);
                //send success message
                socket.emit('loginSuccess');
                io.emit('userLogin',data);
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
            data.name = socket.fb_user.name;
            io.emit('chat', data);
        });

        
        function sendOnlineUsers() {
            var online_user_list = [];

            //find people who has logined
            for (var i in online_user) {
                if (online_user[i].fb_user) {
                    online_user_list.push(online_user[i].fb_user);
                }
            }

            //send online user list
            socket.emit('onlineUsers', {
                data: online_user_list
            });
        }
    });
};