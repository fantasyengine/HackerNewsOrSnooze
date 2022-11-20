$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form"); // +++ form element to submit story
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles"); // +++ ul element for holding user's posted stories
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $body = $('body'); // +++ page body element
  const $alert = $("#alert"); // +++ authentication alert box
  const $navWelcome = $("#nav-welcome"); // +++ span element parent to usernam a element
  const $mainNavLinks = $(".main-nav-links"); // +++ navbar links for authenticated users
  const $navSubmit = $("#nav-submit"); // +++ navbar submit link (a element) for authenticated users
  const $navFavorites = $("#nav-favorites"); // +++ navbar favorites link (a element) for authenticated users
  const $navMyStories = $("#nav-my-stories"); // +++ navbar my stories link (a element) for authenticated users
  const $articlesContainer = $(".articles-container"); // +++ main container for articles
  const $navUserProfile = $("#nav-user-profile"); // +++ authenticated username, link to user profile
  const $userProfile = $("#user-profile"); // +++ section element displaying user profile details
  const $favoritedStories = $("#favorited-articles"); // +++ ul element to append user's favorited stories

  // global storyList and currentUser variables
  let storyList = null;
  let currentUser = null;
  
  await checkIfLoggedIn();

  // Event listener for logging in - If successfully we will setup the user instance
  // +++ form displayed after 'login/create user' click
  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); 
    // get the username and password from fields
    const username = $("#login-username").val();
    const password = $("#login-password").val();
    // +++ add try-catch blocks for simple username/password error handling
    try {
      // call the login static method to build a user instance
      const userInstance = await User.login(username, password)
      // set the global user to the user instance
      currentUser = userInstance; 
      syncCurrentUserToLocalStorage(); // handle adding current user to local storage
      loginAndSubmitForm();
    }
    catch(e) {
      const { data } = e.response;
      const { message } = data.error;
      alertMessage(message); // call alertMessage function, pass in message
    }
  });

  // Event listener for signing up.
  // If successfully we will setup a new user instance
  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    let name = $("#create-account-name").val(); // detect required value
    let username = $("#create-account-username").val(); // detect required value
    let password = $("#create-account-password").val(); // detect required value
    // +++ add try-catch blocks to catch duplicate username errors
    try {
      // call the create method, which calls the API and then builds a new user instance
      const newUser = await User.create(username, password, name);
      currentUser = newUser;
      syncCurrentUserToLocalStorage(); // handle adding current user to local storage
      loginAndSubmitForm();
    }
    catch(e) {
      const { data } = e.response;
      const { message } = data.error;
      alertMessage(message); // call alertMessage function, pass in message
    }
    
  });

  function alertMessage (message, type) {
    $alert.slideDown("slow", function(){ // display alert div
      $alert.text(message).delay(1800).slideUp(); // display error message
    })
    $alert.text(''); // reset message text

  }

  // +++ Event listener for story submission form  
  // If successful, will add new story to the list
  $submitForm.on("submit", async function(evt) {
    evt.preventDefault(); 
    // get story details and username of submitter 
    const author = $("#author").val();
    const title = $("#title").val();
    const url = $("#url").val();
    const username = currentUser.username;
    const hostName = getHostName(url);
    const storyPayload = { author, title, url, username }; // required object props for API

    const newStory = await storyList.addStory(currentUser, storyPayload)

    // +++ HTML for added story
    const storyMarkup = $(`
      <li id="${newStory.storyId}">
        <span class="star">
          <i class="far fa-star"></i>
        </span>
        <a class="article-link" href="${newStory.url}" target="a_blank">
          <strong>${newStory.title}</strong>
        </a>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-author">by ${newStory.author}</small>
        <small class="article-username">posted by ${newStory.username}</small>
      </li>
    `);

    $allStoriesList.prepend(storyMarkup);

    $submitForm.slideUp("slow").trigger("reset");

  });

  // +++++++++++++++++++++ Event Handlers ++++++++++++++++++++++++ // 
  // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ //

  // +++ Event Handler for Clicking Login 
  $navLogin.on("click", () => { 
    $loginForm.slideToggle(); // +++ use slideToggle animation jQuery method to show login/Account screen
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  })

  // +++ Event Handler for Clicking Logout
  $navLogOut.on("click", () => { 
    $mainNavLinks.hide();
    $navUserProfile.text(); // +++ check this - use/function
    localStorage.clear(); // empty local storage
    location.reload(); // refresh page, clearing memory
  })

  // +++ Event Handler for Clicking "submit" link on authenticated navbar
  $navSubmit.on("click", () => {
    if (currentUser) { // if authenticated user is true
      hideElements();
      $allStoriesList.show();
      $submitForm.slideToggle();
    }
  })

  // +++ Event Handler for Clicking "favorites" link on authenticated navbar
  $navFavorites.on("click", () => {
    hideElements(); // +++ call hideElements func to hide other page elements
    generateFaves(); // call generateFaves function to gather user's fav'd stories
    $favoritedStories.show(); // show user's fav'd stories, reveal hidden ul
  })

  // +++ Event Handler for Clicking "my stories" link on authenticated navbar
  $navMyStories.on("click", () => {
    hideElements(); // +++ call hideElements func to hide other page elements
    generateMyStories(); // call generateMyStories to gather user's posted stories
    $ownStories.show(); // show user's posted stories, reveal hidden ul
  })

  // +++ Event Handler for clicking username link on authenticated navbar
  $navUserProfile.on("click", () => {
    hideElements(); // +++ call hideElements func to hide other page elements
    $userProfile.show(); // show user profile details, reveal hidden section
  })

  // Event handler for navigation to favorites 
  $body.on("click", "nav-favorites", () => {
    hideElements();
    if (currentUser) {
      generateFaves();
      $favoritedStories.show();
    }
  });

  // Event Handler for Navigation to Homepage 
  $body.on("click", "#nav-all", async () => {
    hideElements(); // call hideElements func to hide other page elements
    await generateStories();
    $allStoriesList.show();
  });

  // Event handler for navigation to my stories
  $body.on("click", "#nav-my-stories", () => {
    hideElements();
    if (currentUser) {
      $userProfile.hide();
      generateMyStories();
      $ownStories.show();
    }
  });

  // Event handler for favorite/un-favorite stories 
  $articlesContainer.on("click", ".star", async function (evt) {
    // add variable to hold target element's id attribute
    let storyId = $(evt.target).closest("li").attr("id");
    // determine which CSS class applied to element, act appropriately 
    if ($(evt.target).hasClass('far')) {
      await currentUser.addFavorite(storyId);
      $(evt.target).removeClass('far').addClass('fas');
    } else {
      await currentUser.removeFavorite(storyId);
      $(evt.target).removeClass('fas').addClass('far');
    }

  });

  // Event handler for deleting story from 'my stories'
  $ownStories.on("click", ".trash-can", async function (evt) {
    // add variable to hold target element's id attribute
    let storyId = $(evt.target).closest("li").attr("id");
    if (isFavorite) {
      await currentUser.removeFavorite(storyId);
    }
    await storyList.removeStory(currentUser, storyId);
    await generateStories();
    hideElements();
    $allStoriesList.show();
  });


  // ++++++++++++ Core Page Functions +++++++++++++++++ //
  // ++++++++++++++++++++++++++++++++++++++++++++++++++ //

  // Upon page load, check local storage to see if user is already logged in
  // Render page appropriately
  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    // if there is a token in localStorage, call User.getLoggedInUser
    // to get an instance of User with the right details
    // this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) { // if resolves to true, call functions to render page
      generateProfile();
      showNavForLoggedInUser();
    }
  }

  // ** A rendering function to run to reset the forms and hide the login info **
  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();
    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");
    generateStories();
    $allStoriesList.show(); // show stories
    showNavForLoggedInUser(); // update nav bar for logged in user 
    generateProfile(); // get user profile
  }

  // +++ Build user profile based on global user instance
  function generateProfile() {
    $("#profile-name").text(`Name: ${currentUser.name}`);
    $("#profile-username").text(`Username: ${currentUser.username}`);
    $("#profile-account-date").text(`Account Created: ${currentUser.createdAt.slice(0, 10)}`);
    $navUserProfile.text(`${currentUser.username}`);
  }

  /* A rendering function to call the StoryList.getStories static method, 
     which will generate a storyListInstance. Then render it.
  */
  async function generateStories() {
    const storyListInstance = await StoryList.getStories(); // get an instance of StoryList
    storyList = storyListInstance; // update our global variable
    $allStoriesList.empty(); // empty out that part of the page
    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const storyLi = generateStoryHTML(story, false, true);
      $allStoriesList.append(storyLi);
    }
  }


  // Function to render HTML for an individual Story instance
  function generateStoryHTML(story, isOwnStory) { // +++ Addd isOwnStory parameter to enable trash can icon user's stories
    let hostName = getHostName(story.url);
    let starType = isFavorite(story) ? "fas" : "far"; // +++ use ternary operator to determine version of fav icon
    const trashCanIcon = isOwnStory ? `<span class="trash-can"><i class="fas fa-trash-alt"></i></span>` : ""; // +++ ternary to assoc trash icon with isOwnStory
    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      ${trashCanIcon}
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup; // return the storyMarkup
  }

  // rendering function to build user favs list
  function generateFaves() {
    $favoritedStories.empty();

    if (currentUser.favorites.length === 0) { // display message if currentUser's favorites array empty
      $favoritedStories.append("<h5>No favorites added!</h5>");
    } else { // else, loop over currentUser's favs array, call generateStoryHTML for each story fav item
      for (let story of currentUser.favorites) {
        let favoriteHTML = generateStoryHTML(story, false, true);
        $favoritedStories.append(favoriteHTML);
      }
    }
  }

  // rendering function to display all user's posted stories
  function generateMyStories() {
    $ownStories.empty();

    if (currentUser.ownStories.length === 0) { // if user's ownStories array is empty, display message
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    } else { // else, loop over ownStories array, call generateStoryHTML, append to page
      for (let story of currentUser.ownStories) {
        let ownStoryHTML = generateStoryHTML(story, true);
        $ownStories.append(ownStoryHTML);
      }
    }

    $ownStories.show();
  }

  /* hide all elements in elementsArr */
  function hideElements() { 
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userProfile,
      $favoritedStories 
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  // +++ show logged-in user navbar
  function showNavForLoggedInUser() {
    $navLogin.hide();
    $userProfile.hide(); // +++ hide the user profile info section
    $(".main-nav-links, #user-profile").toggleClass("hidden"); // +++ toggleClass to display authenticated user nav links
    $navWelcome.show();
    $navLogOut.show();

  }

  // +++ function to account for user favorites 
  function isFavorite(story) {
    let favStoryIds = new Set();
    if (currentUser) {
      favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
    }
    return favStoryIds.has(story.storyId);
  }

  /* simple function to pull the hostname from a URL */
  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
