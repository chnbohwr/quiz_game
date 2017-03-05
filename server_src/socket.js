const uuid = require('node-uuid');

const quiz = require('../quiz.json');

const mongoose = require('mongoose');

let nowQuiz = undefined;

// quiz waitting for answer time
const quizTime = 20;

// quiz over, waitting for next quiz time
const nextQuizTime = 10;

// 線上的 socket 列表
let onlineSocketList = [];

// 登入facebook 以後把socket 物件 push 進去 array
let onlineUserList = [];

// 當前回答問題的使用者 facebook_id
let answeredUserList = [];

// connect mongo db
mongoose.connect('mongodb://localhost/test');

// define model
const User = mongoose.model('User',
  {
    facebook_id: String,
    name: String,
    score: Number,
  }
);

// todo fix it
const sendOnlineUsers = (socket) => {
  // send online user list
  socket.emit('onlineUsers', onlineUserList);
};

const sendNowQuestion = (socket) => {
  // console.log(nowQuiz);
  if (!nowQuiz) {
    return;
  }
  // send question to user
  const sendData = {
    q: nowQuiz.q,
    o: nowQuiz.o,
    deadline: nowQuiz.deadline,
    uuid: nowQuiz.uuid,
  };
  socket.emit('server_question', sendData);
};

const findUserBySocketId = (userSocketId) => {
  let userData = onlineUserList.find(userObj => userObj.socket_id === userSocketId);

  if (!userData) {
    userData = {
      id: 0,
      name: '未知用戶',
    };
  }
  return userData;
};


/**
 * @class SocketConnection
 * @param {Object} io require io and create server by express
 */
module.exports = (io) => {
  // when connect
  io.on('connection', (socket) => {
    console.log('a user connected');

    // 把 socket 放到 onlineSocketList 列表裡面
    onlineSocketList.push(socket);
    // 當使用者連線以後先給予目前的線上使用者跟目前問題
    sendOnlineUsers(socket);
    sendNowQuestion(socket);

    // receive disconnection data
    socket.on('disconnect', () => {
      console.log('a user disconnected');
      // splice socket from onlineSocketList
      // [{socketObj}, {socketObj}, {socketObj}]
      onlineSocketList = onlineSocketList.filter(socketObj => socketObj.id !== socket.id);

      // delete facebook id when logout
      if (socket.facebook_id) {
        // 告訴全體人員有人登出遊戲
        io.emit('userLogout', {
          facebook_id: socket.facebook_id,
        });


        // 找到 facebook 帳號踢出列表
        onlineUserList = onlineUserList.filter(userObj => socket.facebook_id !== userObj.id);
      }
    });
    // on disconnect end.

    // receive login data
    socket.on('login', (data) => {
      // 找看看有沒有重複登入
      const hasLoginList = onlineUserList.filter(userObj => data.id === userObj.id);

      if (hasLoginList.length === 0) {
        const userData = Object.assign({}, data);
        // 取得玩家累計分數
        User.findOne({ facebook_id: data.id }, (err, users) => {
          if (err) throw err;

          if (users) {
            userData.score = users.score;
          } else {
            // console.log("user not exist, init user data to db");
            const user = new User({ facebook_id: data.id, name: data.name, score: 0 });

            userData.score = user.score;
            user.save((error) => {
              if (err) {
                console.log(error);
              }
            });
          }
        });

        // 把facebook 資訊放到 socket 裡面
        userData.socket_id = socket.id;
        userData.facebook_id = data.id;
        socket.facebook_id = data.id;
        // 把使用者放的 onlineUserList 裡面
        onlineUserList.push(userData);
        // 告訴自己登入成功
        socket.emit('loginSuccess');
        // 告訴大家有使用者登入
        io.emit('userLogin', userData);
      } else {
        // send login error message
        socket.emit('loginError', {
          code: 0,
          message: 'has logined on other platform',
        });
      }
    });
    // on login end.


    /**
     * fake login
     * data = { name: 'xxxx' }
     */
    socket.on('fakeLogin', (data) => {
      const fbid = uuid.v4();
      const userData = {
        id: fbid,
        socket_id: socket.id,
        facebook_id: fbid,
        name: data.name,
        score: 0,
      };

      onlineUserList.push(userData);

      // 告訴自己登入成功
      socket.emit('loginSuccess', userData);
      // 告訴大家有使用者登入
      io.emit('userLogin', userData);
    });

    // receive chat data
    // {
    //     message: "test"
    // }
    socket.on('chat', (data) => {
      const chatData = Object.assign({}, data);
      chatData.datetime = new Date();
      chatData.name = findUserBySocketId(socket.id).name;
      io.emit('chat', chatData);
    });


    /**
     * data.uuid nowQuiz.uuid
     * data.answer , user select answer
     */
    socket.on('selectAnswer', (data) => {
      // 如果現在沒有題目正在執行就跳出
      if (!nowQuiz) {
        return;
      }

      // 檢查題目的 uuid 有沒有正確
      if (nowQuiz.uuid !== data.uuid) {
        return;
      }

      // 如果回答過問題就不能再回答了
      const answerIndex = answeredUserList.indexOf(socket.facebook_id);
      if (answerIndex > -1) {
        return;
      }

      // caculate user score
      if (data.answer === nowQuiz.a) {
        const user = findUserBySocketId(socket.id);
        user.score += 1;

        // 把分數存進db
        const options = { upsert: true, new: true, setDefaultsOnInsert: true };
        User.findOneAndUpdate({ facebook_id: socket.facebook_id }, { $set: { score: user.score } }, options, (err) => {
          if (err) {
            console.log('Something wrong when updating data!');
          }
        });
      }

      // 告訴大家他選了什麼答案
      io.emit('userSelectAnswer', {
        facebook_id: socket.facebook_id,
        answer: data.answer,
      });
    });
  });
  // end io.on connection

  // 給解答
  function giveAnswer() {
    io.emit('server_answer', {
      a: nowQuiz.a,
    });

    // todo clear nowQuiz
    nowQuiz = undefined;

    // clear answer user
    answeredUserList = [];

    // set timeout to broadcast next question
    setTimeout(askQuestion, nextQuizTime * 1000);
  }

  function askQuestion() {
    // random question
    const choosedQuestion = quiz[Math.floor(Math.random() * quiz.length)];
    // console.log('choosedQuestion', choosedQuestion);

    nowQuiz = Object.assign({}, choosedQuestion);
    // random answer(1,2,3,4)
    nowQuiz.a = Math.floor(Math.random() * 4) + 1;
    // 打散陣列重新組合成配合答案的選項陣列
    const tempOption = nowQuiz.o.splice(0, 1);
    nowQuiz.o.splice(nowQuiz.a - 1, 0, tempOption[0]);

    // 設定問題結束時間
    let deadline = new Date();
    deadline = deadline.setSeconds(deadline.getSeconds() + quizTime);
    nowQuiz.deadline = deadline;

    // 產生問題的 uuid
    nowQuiz.uuid = uuid.v4();

    // console.log(nowQuiz);
    const questionData = {
      q: nowQuiz.q,
      o: nowQuiz.o,
      deadline: nowQuiz.deadline,
      uuid: nowQuiz.uuid,
    };

    // console.log('nowQuiz', nowQuiz);

    // 發送問題給每個使用者
    io.emit('server_question', questionData);

    // 設定時間給解答
    setTimeout(giveAnswer, quizTime * 1000);
  }

  askQuestion();
};
