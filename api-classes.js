const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

// Class to handle story instances - fetch, add, and remove stories
class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  static async getStories() { // +++ utility method to get stories from API, build array of stories, return storyList
    // query the /stories endpoint (no auth required)
    const response = await axios.get(`${BASE_URL}/stories`);
    // turn the plain old story objects from the API into instances of the Story class
    const stories = response.data.stories.map(story => new Story(story));
    // build an instance of our own class using the new array of stories
    const storyList = new StoryList(stories);
    return storyList;
  }
  // Make a POST request to /stories, add story to front of stories array
  // Params: user (current instance of user), newStory (story object to send - title, author, url)
  // Returns the new story object
  async addStory(user, newStory) { 
    // Function to return created story and facilitate DOM appened (ui.js)
    const userData = { // +++ API required data format
      token: user.loginToken,
      story: newStory
    }
    const response = await axios({ // +++ response variable with await keyword, post to /stories, pass in userData
      method: "POST", 
      url: `${BASE_URL}/stories`,
      data: userData
    });
    
    newStory = new Story(response.data.story); // +++ create a Story instance out of the story object returned
    this.stories.unshift(newStory); // +++ add the story to the front of the stories array
    user.ownStories.unshift(newStory); // +++ also add the story to the front of the user's individual list (ownStories array)
    // +++ return the newStory:
    return newStory;
  }
  // +++ Allow logged in users to remove a story
  async removeStory(user, storyId) {
    // +++ use DELETE method to remove a story posted by user
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: "DELETE",
      data: {
       "token": user.loginToken
      }
    });

    this.stories = this.stories.filter(story => story.storyId !== storyId); // +++ use filter method to return new array of stories, minus the passed in storyId
    user.ownStories = user.ownStories.filter(s => s.storyId !== storyId); // +++ filter again for user's own story array, remove passed in storyId
  }
}

// User class to represent current user - helper methods for signup (create user), login, getLoggedInUser:
class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;
    // these are all set to defaults, not passed in by the constructor
    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
  }

  // Create and return new user by making POST request to API
  static async create(username, password, name) {
    const response = await axios.post(`${BASE_URL}/signup`, { // +++ post method because we're adding a new user object
      user: {
        username, // a new username
        password, // a new password
        name // the user's full name
      }
    });
    // build a new User instance from the API response
    const newUser = new User(response.data.user);
    // attach the token to the newUser instance for convenience
    newUser.loginToken = response.data.token;
    return newUser;
  }

  // Login in user with existing user's username, password. Return user instance.
  static async login(username, password) {
    const response = await axios.post(`${BASE_URL}/login`, {
      user: {
        username,
        password
      }
    });

    // build a new User instance from the API response
    const existingUser = new User(response.data.user);
    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));
    // attach the token to the newUser instance for convenience
    existingUser.loginToken = response.data.token;
    // +++ return existingUser
    return existingUser;
  }

  // GET request - get user instance for logged-in-user
  // token and username used for API request, get user details and create instance of user
  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null;
    // call the API
    const response = await axios.get(`${BASE_URL}/users/${username}`, {
      params: {
        token
      }
    });
    // instantiate the user from the API information
    const existingUser = new User(response.data.user);
    // attach the token to the newUser instance for convenience
    existingUser.loginToken = token;
    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map((s) => new Story(s));
    existingUser.ownStories = response.data.user.stories.map((s) => new Story(s));
    return existingUser; // return existingUser
  }

  // +++ function fetches user info from API
  async retrieveDetails() {
    const response = await axios.get(`${BASE_URL}/users/${this.username}`, {
      params: {
        token: this.loginToken
      }
    });

    // update all of the user's properties from the API resource 
    this.name = response.data.user.name;
    this.createdAt = response.data.user.createdAt;
    this.updatedAt = response.data.user.updatedAt;
    this.favorites = response.data.user.favorites.map(s => new Story(s));
    this.ownStories = response.data.user.stories.map(s => new Story(s));

    return this;
  }

  // +++ add a story (based on storyId) to user's array of favorites, return _tggleFavories method with 'POST' httpVerb
  addFavorite(storyId) {
    return this._toggleFavorite(storyId, 'POST');
  }
  // +++ remove a story (based on storyId) from user's array of favorities, return _tggleFavories method with 'DELETE' httpVerb
  removeFavorite(storyId) {
    return this._toggleFavorite(storyId, 'DELETE');
  }
  // +++ method to add/delete favorites, pass in storyId and an httpVerb ('POST' or 'DELETE')
  async _toggleFavorite(storyId, httpVerb) {
    await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
      method: httpVerb,
      data: {
        token: this.loginToken
      }
    });

    await this.retrieveDetails();
    return this;
  }

  // +++ PATCH request to API - update userData
  async update(userData) {
    const response = await axios({
      url: `${BASE_URL}/users/${this.username}`,
      method: "PATCH",
      data: {
        user: userData,
        token: this.loginToken
      }
    });
    // update user's name
    this.name = response.data.user.name;
    return this;
  }

  // +++ DELETE request to API - remove user
  async remove() {
    await axios({
      url: `${BASE_URL}/users/${this.username}`,
      method: "DELETE",
      data: {
        token: this.loginToken
      }
    });
  }
}

// Class to represent a single story.
class Story {
  // The constructor is designed to take an object for better readability / flexibility
  // storyObj: an object that has story properties in it
  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }

  // +++ PATCH request to API to update a single story, user = instance of User, storyData = object with props to update
  async update(user, storyData) {
    const response = await axios({
      url: `${BASE_URL}/stories/${this.storyId}`,
      method: "PATCH",
      data: {
        token: user.loginToken,
        story: storyData
      }
    });

    const { author, title, url, updatedAt } = response.data.story;
    this.author = author;
    this.title = title;
    this.url = url;
    this.updatedAt = updatedAt;

    return this;
  }
}