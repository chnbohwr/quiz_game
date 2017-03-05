import React from 'react';
import ReactDOM from 'react-dom';
import io from 'socket.io-client';
import NotificationSystem from 'react-notification-system';
import { Grid, Segment, Modal, Input, Button, Header, Item } from 'semantic-ui-react';

const socket = io();

class App extends React.Component {

  state = {
    isLoginGame: false,
    isLoginFB: false,
    onlineUsers: [],
    loginName: 'No Name',
    question: {
      q: 'None',
      o: [],
    },
    myAnswer: -1,
    answer: -1,
    isAnswer: false,
    isTimeout: false,
    chatLog: [],
    message: '',
  }

  componentDidMount() {
    this._notificationSystem = this.refs.notificationSystem;
    socket.on('chat', this.receiveMessage);
    socket.on('onlineUsers', this.receiveOnlineUsers);
    socket.on('loginSuccess', this.loginSuccess);
    socket.on('loginError', this.loginError);
    socket.on('userLogin', this.userLogin);
    socket.on('userLogout', this.userLogout);
    socket.on('server_question', this.receiveQuestion);
    socket.on('server_answer', this.receiveAnswer);
    socket.on('userSelectAnswer', this.userSelectAnswer);
  }

  receiveMessage = (data) => {
    console.log('receiveMessage', data);
    this.setState({
      chatLog: [...this.state.chatLog, data],
    });
  }

  receiveOnlineUsers = (data) => {
    this.setState({
      onlineUsers: data,
    });
    console.log('receiveOnlineUsers', data);
  }

  loginSuccess = (data) => {
    this._notificationSystem.addNotification({
      message: '登入成功',
      level: 'success',
    });
    this.setState({
      isLoginGame: true,
    });
  }

  loginError = (data) => {
    console.log('loginError', data);
  }

  userLogin = (data) => {
    this._notificationSystem.addNotification({
      message: `玩家: ${data.name} 登入遊戲`,
      level: 'success',
    });
  }

  userLogout = (data) => {
    console.log('userLogout', data);
  }

  receiveQuestion = (data) => {
    console.log('serverQuestion', data);
    this.setState({
      question: data,
      myAnswer: -1,
      answer: -1,
      isAnswer: false,
      isTimeout: false,
    });
  }

  receiveAnswer = (data) => {
    this.setState({
      answer: data.a - 1,
      isTimeout: true,
    });
    console.log('receiveAnswer', data);
  }

  userSelectAnswer = (data) => {
    console.log('userSelectAnswer', data);
  }

  answer = (answer) => {
    const { isAnswer, question, isTimeout } = this.state;

    if (!isAnswer && !isTimeout) {
      this.setState({
        myAnswer: answer,
        isAnswer: true,
      });

      socket.emit('selectAnswer', {
        uuid: question.uuid,
        answer: answer + 1,
      });
    }
  }

  sendMessage = () => {
    const { message } = this.state;
    if (message !== '') {
      socket.emit('chat', {
        message,
      });

      this.setState({
        message: '',
      });
    }
  }

  clickFBLogin = () => {
    let facebookData;
    const getAvatar = (avatar) => {
      facebookData.avatar = avatar.data.url;
      socket.emit('login', facebookData);
    };
    const getProfile = (profile) => {
      facebookData = profile;
      window.FB.api('/me/picture', getAvatar);
    };
    const loginFBSuccess = () => {
      window.FB.api('/me', getProfile);
    };
    window.FB.login(loginFBSuccess, {
      scope: 'public_profile,email,user_friends'
    });
  }

  render() {
    const { isLoginGame, question, myAnswer, answer, chatLog, message } = this.state;

    const options = question.o.map((option, index) => (
      <Segment
        key={option}
        onClick={() => this.answer(index)}
        inverted={myAnswer === index || answer === index}
        color={answer === index ? 'green' : 'blue'}
      >
        {`${index + 1}. ${option}`}
      </Segment>
    ));

    const chats = chatLog.map(chat => (
      <Item>
        <Item.Image size="mini" src="http://semantic-ui.com/images/wireframe/image.png" />
        <Item.Content verticalAlign="middle">
          <Item.Meta>{chat.name}</Item.Meta>
          <Item.Description>{chat.message}</Item.Description>
        </Item.Content>
      </Item>
    ));

    return (
      <div style={{ height: '100vh' }}>
        <NotificationSystem ref="notificationSystem" />
        {
          !isLoginGame &&
          <Modal dimmer="blurring" open size="small">
            <Modal.Actions>
              <Button primary content="Facebook 登入" onClick={() => this.clickFBLogin()} />
            </Modal.Actions>
          </Modal>
        }
        <Grid>
          <Grid.Column width={10}>
            <Segment raised style={{ height: '100vh' }}>
              <Header as="h2">{question.q}</Header>
              <Segment.Group>
                {options}
              </Segment.Group>
            </Segment>
          </Grid.Column>
          <Grid.Column width={6}>

            <Grid divided='vertically'>
              <Grid.Row style={{ height: '90vh', width: '100%', overflow: 'scroll' }}>
                <Item.Group divided style={{ width: '100%' }}>
                  {chats}
                </Item.Group>
              </Grid.Row>
              <Grid.Row>
                <Input type="text" placeholder="Search..." action style={{ width: '100%' }}>
                  <input value={message} onChange={e => this.setState({ message: e.target.value })} />
                  <Button onClick={() => this.sendMessage()}>Search</Button>
                </Input>
              </Grid.Row>
            </Grid>
          </Grid.Column>
        </Grid>
      </div>
    );
  }
}

/**
 * get facebook sdk
 */
window.fbAsyncInit = function () {
  FB.init({
    appId: '1633361533588392',
    xfbml: true,
    version: 'v2.8'
  });
  ReactDOM.render(<App />, document.getElementById('root'));
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