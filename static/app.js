// =========================================================
// STAYMATE AI
// HOTEL BOOKING CHATBOT
// =========================================================
//
// Working frontend baseline restored.
//
// Location flow:
//
// Location search box
//      ↓
// User types
//      ↓
// /api/locations/search
//      ↓
// Real-time Indian location suggestions
//      ↓
// User selects location
//      ↓
// Canonical location
//      ↓
// /api/hotels
//
// Automatic location:
//
// Find hotels
//      ↓
// Browser GPS
//      ↓
// /api/location/reverse
//      ↓
// IP fallback
//      ↓
// /api/hotels
//
// IMPORTANT:
// There is ONLY ONE chat form submit handler.
// =========================================================


// =========================================================
// DOM ELEMENTS
// =========================================================

const chat =
  document.getElementById(
    'chat'
  );


const input =
  document.getElementById(
    'input'
  );


const form =
  document.getElementById(
    'chatForm'
  );


const locationSearch =
  document.getElementById(
    'locationSearch'
  );


const locationResults =
  document.getElementById(
    'locationResults'
  );

// =========================================================
// PAGE-LEVEL SMOOTH SCROLLING
// =========================================================

function scrollToAssistant() {

  const assistant =
    document.getElementById(
      'assistant'
    );


  if (
    assistant
  ) {

    assistant.scrollIntoView(
      {
        behavior:
          'smooth',

        block:
          'start'
      }
    );
  }
}


function scrollToDestinationSearch() {

  const destinationSearch =
    document.getElementById(
      'locationSearch'
    );


  if (
    destinationSearch
  ) {

    destinationSearch.scrollIntoView(
      {
        behavior:
          'smooth',

        block:
          'center'
      }
    );


    destinationSearch.focus();
  }
}

// =========================================================
// GLOBAL SECTION SCROLL MANAGER
// =========================================================

function scrollToStayMateSection(element) {

    if (
        !element
    ) {

        return;
    }


    setTimeout(
        () => {

            element.scrollIntoView(
                {
                    behavior:
                        "smooth",

                    block:
                        "start"
                }
            );

        },
        100
    );
}

// =========================================================
// APPLICATION STATE
// =========================================================

let context = {

  location:
    null,

  checkIn:
    null,

  checkOut:
    null,

  adults:
    2,

  children:
    0,

  rooms:
    1,

  roomType:
    null
};


let lastResults =
  [];


let nextPageToken =
  null;


let userCoords =
  null;


let awaiting =
  null;


let autoLocationInProgress =
  false;


let searchInProgress =
  false;


// =========================================================
// LOCATION SEARCH STATE
// =========================================================

let locationSearchTimer =
  null;


let locationSearchController =
  null;


let locationSuggestions =
  [];


let activeLocationIndex =
  -1;


// =========================================================
// LOGGING
// =========================================================

function logInfo(
  area,
  message,
  data = null
) {

  if (
    data === null
  ) {

    console.info(
      `[STAYMATE][${area}] ${message}`
    );

    return;
  }


  console.info(
    `[STAYMATE][${area}] ${message}`,
    data
  );
}


function logError(
  area,
  message,
  error = null
) {

  if (
    error
  ) {

    console.error(
      `[STAYMATE][${area}] ${message}`,
      error
    );

    return;
  }


  console.error(
    `[STAYMATE][${area}] ${message}`
  );
}


// =========================================================
// BOOKING UI TARGET
// =========================================================
// Regular website bookings stay in the main hotel chat. When the user starts
// booking from the AI Assistant's View Prices flow, render every booking step
// inside the floating assistant conversation instead.
function getBookingFlowContainer() {
  if (window.__stayMateAssistantBookingFlow === true && smAiMessages) {
    return smAiMessages;
  }
  return chat;
}

function appendBookingFlowUI(element) {
  const target = getBookingFlowContainer();
  if (!target || !element) return null;

  if (window.__stayMateAssistantBookingFlow === true && target === smAiMessages) {
    element.classList.add('sm-ai-message', 'sm-ai-bot', 'sm-ai-booking-flow-ui');
    element.style.width = '100%';
    element.style.maxWidth = '100%';
    element.style.boxSizing = 'border-box';
    element.style.margin = '8px 0';
  }

  target.appendChild(element);
  target.scrollTop = target.scrollHeight;
  return element;
}

function removeExistingBookingUI(selector) {
  const target = getBookingFlowContainer();
  if (!target) return;
  target.querySelectorAll(selector).forEach(element => element.remove());
}

// =========================================================
// CHAT MESSAGE HELPER
// =========================================================

function add(
  text,
  who = 'bot',
  html = false
) {

  if (window.__stayMateAssistantBookingFlow === true && !html && typeof smAiAddMessage === 'function') {
    return smAiAddMessage(String(text ?? ''), who === 'user' ? 'user' : 'bot');
  }

  if (
    !chat
  ) {

    return null;
  }


  const message =
    document.createElement(
      'div'
    );


  message.className =
    `message ${who}`;


  const bubble =
    document.createElement(
      'div'
    );


  bubble.className =
    'bubble';


  if (
    html
  ) {

    bubble.innerHTML =
      text;

  } else {

    bubble.textContent =
  text;

bubble.style.whiteSpace =
  'pre-line';

bubble.style.overflowWrap =
  'anywhere';

}


  message.appendChild(
    bubble
  );


  chat.appendChild(
    message
  );


  chat.scrollTop =
    chat.scrollHeight;


  return message;
}


// =========================================================
// =========================================================
// LOADING MESSAGE
// =========================================================

function addLoading(
  text
) {

  if (
    !chat
  ) {

    return null;
  }


  const message =
    document.createElement(
      'div'
    );


  message.className =
    'message bot loading-message';


  const bubble =
    document.createElement(
      'div'
    );


  bubble.className =
    'bubble loading-bubble';


  bubble.innerHTML = `
    <span class="loading-spinner"></span>
    <span>${esc(text)}</span>
  `;


  message.appendChild(
    bubble
  );


  chat.appendChild(
    message
  );


  chat.scrollTop =
    chat.scrollHeight;


  return message;
}


// =========================================================
// GET REQUEST
// =========================================================

async function get(
  url
) {

  const response =
    await fetch(
      url
    );


  if (
    !response.ok
  ) {

    let message =
      `Server returned ${response.status}`;


    try {

      const data =
        await response.json();


      if (
        data?.error
      ) {

        message =
          data.error;
      }

    } catch (_) {

      // Ignore JSON parsing errors.
    }


    throw new Error(
      message
    );
  }


  return response.json();
}


// =========================================================
// POST REQUEST
// =========================================================

async function post(
  url,
  body
) {

  const response =
    await fetch(
      url,
      {
        method:
          'POST',

        headers:
          {
            'Content-Type':
              'application/json'
          },

        body:
          JSON.stringify(
            body
          )
      }
    );


  if (
    !response.ok
  ) {

    let message =
      `Server returned ${response.status}`;


    try {

      const data =
        await response.json();


      if (
        data?.error
      ) {

        message =
          data.error;
      }

    } catch (_) {

      // Ignore JSON parsing errors.
    }


    throw new Error(
      message
    );
  }


  return response.json();
}


// =========================================================
// HTML ESCAPE
// =========================================================

function esc(
  value
) {

  return String(
    value ?? ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}
// =========================================================
// MONEY FORMATTER
// =========================================================

function money(
  value
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return '₹0';
  }


  return new Intl.NumberFormat(
    'en-IN',
    {
      style:
        'currency',

      currency:
        'INR',

      maximumFractionDigits:
        0
    }
  ).format(
    number
  );
}

// =========================================================
// DATE HELPERS
// =========================================================

function toISO(
  date
) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );


  return `${year}-${month}-${day}`;
}


function validDateRange(
  checkIn,
  checkOut
) {

  if (
    !checkIn ||
    !checkOut
  ) {

    return false;
  }


  const start =
    new Date(
      `${checkIn}T00:00:00`
    );


  const end =
    new Date(
      `${checkOut}T00:00:00`
    );


  if (
    Number.isNaN(
      start.getTime()
    ) ||
    Number.isNaN(
      end.getTime()
    )
  ) {

    return false;
  }


  return end >
    start;
}


// =========================================================
// DATE PARSER
// =========================================================

function parseDateRange(
  text
) {

  const value =
    String(
      text || ''
    )
      .trim()
      .toLowerCase();


  const today =
    new Date();


  today.setHours(
    0,
    0,
    0,
    0
  );


  if (
    value.includes(
      'tomorrow'
    )
  ) {

    const checkIn =
      new Date(
        today
      );


    checkIn.setDate(
      checkIn.getDate() + 1
    );


    const checkOut =
      new Date(
        checkIn
      );


    checkOut.setDate(
      checkOut.getDate() + 1
    );


    return {
      checkIn:
        toISO(
          checkIn
        ),

      checkOut:
        toISO(
          checkOut
        )
    };
  }


  if (
    value.includes(
      'today'
    )
  ) {

    const checkIn =
      new Date(
        today
      );


    const checkOut =
      new Date(
        today
      );


    checkOut.setDate(
      checkOut.getDate() + 1
    );


    return {
      checkIn:
        toISO(
          checkIn
        ),

      checkOut:
        toISO(
          checkOut
        )
    };
  }


  return null;
}


// =========================================================
// GUEST PARSER
// =========================================================

function parseGuests(
  text
) {

  const value =
    String(
      text || ''
    ).toLowerCase();


  let adults =
    null;


  let children =
    null;


  let match =
    value.match(
      /\bfor\s+(\d+)\s+(?:people|persons|guests|adults)\b/i
    );


  if (
    !match
  ) {

    match =
      value.match(
        /\b(\d+)\s+(?:people|persons|guests|adults|pax)\b/i
      );
  }


  if (
    match
  ) {

    adults =
      Number(
        match[1]
      );
  }


  const childMatch =
    value.match(
      /\b(\d+)\s+(?:children|kids)\b/i
    );


  if (
    childMatch
  ) {

    children =
      Number(
        childMatch[1]
      );
  }


  return {
    adults,
    children
  };
}


// =========================================================
// ROOM PARSER
// =========================================================

function parseRooms(
  text
) {

  const value =
    String(
      text || ''
    ).toLowerCase();


  const match =
    value.match(
      /\b(\d+)\s+rooms?\b/i
    );


  if (
    !match
  ) {

    return null;
  }


  return Number(
    match[1]
  );
}


// =========================================================
// LOCATION PARSER
// =========================================================
//
// Extract explicit destination from phrases such as:
//
// find hotels in Chittoor
// search hotels near Bengaluru
// show hotels at Tirupati
// hotels around Hyderabad
//
// =========================================================

function parseLocation(
  text
) {

  const value =
    String(
      text || ''
    ).trim();


  if (
    !value
  ) {

    return null;
  }


  const match =
    value.match(
      /\b(?:in|at|near|around)\s+([A-Za-z][A-Za-z .,'-]{2,60})/i
    );


  if (
    !match
  ) {

    return null;
  }


  let location =
    match[1]
      .split(
        /\b(?:for|from|to|on|with|tomorrow|today|and)\b/i
      )[0]
      .trim();


  location =
    location
      .replace(
        /[,.!?]+$/,
        ''
      )
      .trim();


  return location ||
    null;
}


// =========================================================
// CLEAR LOCATION RESULTS
// =========================================================

function clearLocationResults() {

  locationSuggestions =
    [];


  activeLocationIndex =
    -1;


  if (
    locationResults
  ) {

    locationResults.innerHTML =
      '';


    locationResults.classList.remove(
      'visible'
    );
  }
}


// =========================================================
// RENDER LOCATION SUGGESTIONS
// =========================================================

function renderLocationSuggestions(
  locations
) {

  clearLocationResults();


  if (
    !locationResults ||
    !Array.isArray(
      locations
    ) ||
    !locations.length
  ) {

    return;
  }


  locationSuggestions =
    locations;


  locations.forEach(
    (
      location,
      index
    ) => {

      const item =
        document.createElement(
          'button'
        );


      item.type =
        'button';


      item.className =
        'location-result';


      item.setAttribute(
        'role',
        'option'
      );


      const title =
        location.canonical_location ||
        location.name ||
        location.display_name ||
        '';


      const subtitle =
        location.display_name &&
        location.display_name !==
          title
          ? location.display_name
          : '';


      item.innerHTML = `
        <span class="location-result-name">
          ${esc(title)}
        </span>

        ${
          subtitle
            ? `
              <span class="location-result-detail">
                ${esc(subtitle)}
              </span>
            `
            : ''
        }
      `;


      item.addEventListener(
        'click',
        async event => {

          event.preventDefault();


          await selectLocation(
            location
          );
        }
      );


      locationResults.appendChild(
        item
      );
    }
  );


  activeLocationIndex =
    -1;


  locationResults.classList.add(
    'visible'
  );
}


// =========================================================
// UPDATE ACTIVE LOCATION ITEM
// =========================================================

function updateActiveLocationItem() {

  if (
    !locationResults
  ) {

    return;
  }


  const items =
    locationResults.querySelectorAll(
      '.location-result'
    );


  items.forEach(
    (
      item,
      index
    ) => {

      item.classList.toggle(
        'active',
        index ===
          activeLocationIndex
      );
    }
  );


  if (
    activeLocationIndex >= 0 &&
    items[
      activeLocationIndex
    ]
  ) {

    items[
      activeLocationIndex
    ].scrollIntoView(
      {
        block:
          'nearest'
      }
    );
  }
}


// =========================================================
// LOCATION SELECTION
// =========================================================

async function selectLocation(
  location
) {

  if (
    !location
  ) {

    return;
  }


  const canonical =
    location.canonical_location ||
    location.name ||
    location.display_name ||
    '';


  if (
    !canonical.trim()
  ) {

    return;
  }


  context.location =
    canonical.trim();


  if (
    locationSearch
  ) {

    locationSearch.value =
      context.location;
  }


  clearLocationResults();


  // Manually selected destination has priority.
  // Do not allow old GPS coordinates to affect
  // this search.
  userCoords =
    null;


  awaiting =
    null;


  logInfo(
    'LOCATION',
    `SELECTED "${context.location}"`
  );


  setDiscoveryDefaults();


  add(
    `📍 Searching hotels in ${esc(
      context.location
    )}...`
  );


  await search(
    false
  );
}


// =========================================================
// SELECT LOCATION FROM TEXT
// =========================================================

async function selectLocationText(
  text
) {

  const query =
    String(
      text || ''
    ).trim();


  if (
    query.length < 2
  ) {

    return;
  }


  try {

    const response =
      await fetch(
        `/api/locations/search?q=${encodeURIComponent(
          query
        )}`
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `Location search failed: ${response.status}`
      );
    }


    const data =
      await response.json();


    const locations =
      Array.isArray(
        data.locations
      )
        ? data.locations
        : [];


    if (
      locations.length
    ) {

      await selectLocation(
        locations[0]
      );


      return;
    }


    add(
      'I could not find that location in India. Please select a location from the suggestions.'
    );

  } catch (
    error
  ) {

    logError(
      'LOCATION',
      'Location selection failed',
      error
    );


    add(
      error.message ||
      'Unable to search that location right now.'
    );
  }
}


// =========================================================
// SEARCH LOCATIONS
// =========================================================

async function searchLocations(
  query
) {

  const value =
    String(
      query || ''
    ).trim();


  if (
    !locationResults
  ) {

    return;
  }


  if (
    locationSearchController
  ) {

    locationSearchController.abort();

    locationSearchController =
      null;
  }


  if (
    value.length < 2
  ) {

    clearLocationResults();

    return;
  }


  const controller =
    new AbortController();


  locationSearchController =
    controller;


  try {

    logInfo(
      'LOCATION',
      `SEARCH query="${value}"`
    );


    const response =
      await fetch(
        `/api/locations/search?q=${encodeURIComponent(
          value
        )}`,
        {
          signal:
            controller.signal
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `Location search failed: ${response.status}`
      );
    }


    const data =
      await response.json();


    if (
      controller !==
      locationSearchController
    ) {

      return;
    }


    renderLocationSuggestions(
      data.locations ||
      []
    );

  } catch (
    error
  ) {

    if (
      error.name ===
      'AbortError'
    ) {

      return;
    }


    logError(
      'LOCATION',
      'Location search failed',
      error
    );


    clearLocationResults();
  }
}


// =========================================================
// LOCATION INPUT EVENTS
// =========================================================

if (
  locationSearch
) {

  locationSearch.addEventListener(
    'input',
    event => {

      const value =
        event.target.value.trim();


      // If user edits a previously selected
      // destination, clear the old selection.
      if (
        context.location !==
        value
      ) {

        context.location =
          null;

        userCoords =
          null;
      }


      clearTimeout(
        locationSearchTimer
      );


      activeLocationIndex =
        -1;


      if (
        value.length < 2
      ) {

        clearLocationResults();

        return;
      }


      locationSearchTimer =
        setTimeout(
          () => {

            searchLocations(
              value
            );

          },
          450
        );
    }
  );


  locationSearch.addEventListener(
    'keydown',
    async event => {

      // ---------------------------------------------------
      // ENTER
      // ---------------------------------------------------

      if (
        event.key ===
        'Enter'
      ) {

        event.preventDefault();


        if (
          activeLocationIndex >= 0 &&
          locationSuggestions[
            activeLocationIndex
          ]
        ) {

          await selectLocation(
            locationSuggestions[
              activeLocationIndex
            ]
          );

        } else {

          const value =
            locationSearch.value.trim();


          if (
            value.length >= 2
          ) {

            await selectLocationText(
              value
            );
          }
        }


        return;
      }


      // ---------------------------------------------------
      // If no suggestions are visible
      // ---------------------------------------------------

      if (
        !locationResults ||
        !locationResults.classList.contains(
          'visible'
        )
      ) {

        return;
      }


      const items =
        locationResults.querySelectorAll(
          '.location-result'
        );


      if (
        !items.length
      ) {

        return;
      }


      // ---------------------------------------------------
      // ARROW DOWN
      // ---------------------------------------------------

      if (
        event.key ===
        'ArrowDown'
      ) {

        event.preventDefault();


        activeLocationIndex =
          (
            activeLocationIndex + 1
          ) %
          items.length;


        updateActiveLocationItem();


        return;
      }


      // ---------------------------------------------------
      // ARROW UP
      // ---------------------------------------------------

      if (
        event.key ===
        'ArrowUp'
      ) {

        event.preventDefault();


        activeLocationIndex =
          activeLocationIndex <= 0
            ? items.length - 1
            : activeLocationIndex - 1;


        updateActiveLocationItem();


        return;
      }


      // ---------------------------------------------------
      // ESCAPE
      // ---------------------------------------------------

      if (
        event.key ===
        'Escape'
      ) {

        clearLocationResults();
      }
    }
  );
}


// =========================================================
// CLOSE LOCATION DROPDOWN OUTSIDE
// =========================================================

document.addEventListener(
  'click',
  event => {

    if (
      !locationSearch ||
      !locationResults
    ) {

      return;
    }


    if (
      !locationSearch.contains(
        event.target
      ) &&
      !locationResults.contains(
        event.target
      )
    ) {

      clearLocationResults();
    }
  }
);


// =========================================================
// DISCOVERY DEFAULTS
// =========================================================

function setDiscoveryDefaults() {

  /*
   * Google Hotels requires check-in/check-out
   * for discovery.
   *
   * These are temporary discovery dates.
   * Actual booking dates are collected later.
   */

  const tomorrow =
    new Date();


  tomorrow.setHours(
    0,
    0,
    0,
    0
  );


  tomorrow.setDate(
    tomorrow.getDate() + 1
  );


  const dayAfter =
    new Date(
      tomorrow
    );


  dayAfter.setDate(
    dayAfter.getDate() + 1
  );


  context.checkIn =
    toISO(
      tomorrow
    );


  context.checkOut =
    toISO(
      dayAfter
    );


  context.adults =
    2;


  context.children =
    0;


  context.rooms =
    1;
}


// =========================================================
// AUTOMATIC LOCATION
// =========================================================
//
// Priority:
//
// 1. Existing/manual location
// 2. Browser GPS
// 3. Reverse GPS
// 4. IP fallback
// 5. Ask user manually
//
// =========================================================



async function automaticLocation(forceRefresh = false) {
  // Preserve an existing or manually entered destination.
  if (context.location && !forceRefresh) {
    return context.location;
  }

  if (autoLocationInProgress) {
    return null;
  }

  autoLocationInProgress = true;

  try {
    logInfo("GPS", "START automatic location");

    // STEP 1: Detect location using browser GPS.
    if (!navigator.geolocation) {
      logInfo("GPS", "Browser geolocation unavailable");
      return null;
    }

    const position = await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          logInfo("GPS", `GPS unavailable: ${error.message}`);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });

    // GPS denied, unavailable, or timed out.
    // Do not use server-side IP geolocation as a fallback.
    if (!position) {
      logInfo(
        "GPS",
        "GPS unavailable; asking user to enter a destination"
      );
      return null;
    }

    userCoords = {
      lat: position.coords.latitude,
      lon: position.coords.longitude
    };

    logInfo("GPS", "GPS coordinates received");

    // STEP 2: Reverse-geocode the GPS coordinates.
    try {
      const result = await get(
        `/api/location/reverse?lat=${encodeURIComponent(userCoords.lat)}&lon=${encodeURIComponent(userCoords.lon)}`
      );

      const location =
        result.canonical_location || result.city;

      if (location) {
        context.location = location;

        if (locationSearch) {
          locationSearch.value = location;
        }

        logInfo("GPS", `GPS location="${location}"`);
        return location;
      }
    } catch (error) {
      logError("GPS", "Reverse geocoding failed", error);
    }

    // GPS worked, but reverse geocoding failed.
    // Do not fall back to the server's IP-derived location.
    logInfo(
      "GPS",
      "Unable to resolve GPS coordinates to a destination"
    );

    return null;
  } finally {
    autoLocationInProgress = false;
  }
}




// =========================================================
// INITIAL HOTEL SEARCH
// =========================================================

async function startHotelSearch() {

  const locationMessage =
    addLoading(
      'Finding your location...'
    );


  try {

    const location =
      await automaticLocation();


    locationMessage.remove();


    if (
      !location
    ) {

      awaiting =
        'location';


        add(
          '📍 Location access is unavailable. Please enter your destination in the chat input below, for example: "Find hotels in Tirupati".',
          "bot",
          true
        );
        
        const chatInput = document.querySelector("#input");
        
        if (chatInput) {
          chatInput.focus();
        }


      return;
    }


    add(
      `📍 Location detected: ${esc(
        location
      )}`,
      'bot',
      true
    );


    setDiscoveryDefaults();


    awaiting =
      null;


    await search(
      false
    );

  } catch (
    error
  ) {

    locationMessage.remove();


    logError(
      'GPS',
      'Automatic location failed',
      error
    );


    add(
      error.message ||
      'Unable to detect your location.'
    );
  }
}


// =========================================================
// PROCESS ANSWER
// =========================================================

async function processAnswer(
  text
) {

  // -------------------------------------------------------
  // LOCATION
  // -------------------------------------------------------

  if (
    awaiting ===
    'location'
  ) {

    const location =
      parseLocation(
        text
      ) ||
      text.trim();


    if (
      !location
    ) {

      add(
        'Please enter a valid city or location in India.'
      );


      return;
    }


    try {

      const data =
        await get(
          `/api/locations/search?q=${encodeURIComponent(
            location
          )}`
        );


      if (
        data.locations?.length
      ) {

        await selectLocation(
          data.locations[0]
        );


        return;
      }

    } catch (
      error
    ) {

      logError(
        'LOCATION',
        'Manual location resolution failed',
        error
      );
    }


    context.location =
      location;


    if (
      locationSearch
    ) {

      locationSearch.value =
        location;
    }


    userCoords =
      null;


    clearLocationResults();


    awaiting =
      null;


    setDiscoveryDefaults();


    await search(
      false
    );


    return;
  }


  // -------------------------------------------------------
  // DATES
  // -------------------------------------------------------

  const dates =
    parseDateRange(
      text
    );


  if (
    dates
  ) {

    context.checkIn =
      dates.checkIn;


    context.checkOut =
      dates.checkOut;
  }


  // -------------------------------------------------------
  // GUESTS
  // -------------------------------------------------------

  const guests =
    parseGuests(
      text
    );


  if (
    guests.adults
  ) {

    context.adults =
      guests.adults;
  }


  if (
    guests.children !==
      null
  ) {

    context.children =
      guests.children;
  }


  // -------------------------------------------------------
  // ROOMS
  // -------------------------------------------------------

  const rooms =
    parseRooms(
      text
    );


  if (
    rooms
  ) {

    context.rooms =
      rooms;
  }


  // -------------------------------------------------------
  // SEARCH
  // -------------------------------------------------------

  if (
    context.location
  ) {

    if (
      !validDateRange(
        context.checkIn,
        context.checkOut
      )
    ) {

      setDiscoveryDefaults();
    }


    await search(
      false
    );


    return;
  }


  // -------------------------------------------------------
  // NORMAL LOCATION PARSING
  // -------------------------------------------------------

  const location =
    parseLocation(
      text
    );


  if (
    location
  ) {

    await selectLocationText(
      location
    );


    return;
  }


  add(
    "Tell me the city or location where you'd like to find hotels, or type 'Find hotels' to use your current location."
  );
}


// =========================================================
// HOTEL SEARCH
// =========================================================

async function search(
  append = false
) {

  if (
    searchInProgress
  ) {

    return;
  }


  if (
    !context.location
  ) {

    add(
      'Please select a destination first.'
    );


    return;
  }


  if (
    !validDateRange(
      context.checkIn,
      context.checkOut
    )
  ) {

    setDiscoveryDefaults();
  }


  searchInProgress =
    true;


  let loadingMessage =
    null;


  try {

    loadingMessage =
      addLoading(
        append
          ? 'Loading more hotels...'
          : 'Searching live hotels...'
      );


    let url =
      `/api/hotels?location=${encodeURIComponent(
        context.location
      )}`;


    url +=
      `&check_in=${encodeURIComponent(
        context.checkIn
      )}`;


    url +=
      `&check_out=${encodeURIComponent(
        context.checkOut
      )}`;


    url +=
      `&adults=${encodeURIComponent(
        context.adults
      )}`;


    url +=
      `&children=${encodeURIComponent(
        context.children
      )}`;


    url +=
      `&rooms=${encodeURIComponent(
        context.rooms
      )}`;


    if (
      append &&
      nextPageToken
    ) {

      url +=
        `&next_page_token=${encodeURIComponent(
          nextPageToken
        )}`;
    }


    logInfo(
      'HOTELS',
      `SEARCH location="${context.location}" check_in=${context.checkIn} check_out=${context.checkOut} adults=${context.adults} children=${context.children} rooms=${context.rooms}`
    );


    const data =
      await get(
        url
      );


    if (
      loadingMessage
    ) {

      loadingMessage.remove();
    }


    const properties =
      Array.isArray(
        data.properties
      )
        ? data.properties
        : [];


    nextPageToken =
      data.next_page_token ||
      null;


    if (
      !append
    ) {

      lastResults =
        properties;

    } else {

      lastResults =
        [
          ...lastResults,
          ...properties
        ];
    }


    if (
      !properties.length
    ) {

      if (
        !append
      ) {

        add(
          `I couldn't find live hotel results for ${esc(
            context.location
          )} for these dates. Try another destination or different dates.`
        );

      } else {

        add(
          'There are no more hotel results available.'
        );
      }


      return;
    }


    add(
      append
        ? `Here are more live hotel options in ${esc(
            context.location
          )}:`
        : `Here are live hotel options in ${esc(
            context.location
          )}:`,
      'bot',
      true
    );


    renderHotels(
      properties
    );


    if (
      nextPageToken
    ) {

      renderLoadMoreButton();
    }


  } catch (
    error
  ) {

    if (
      loadingMessage
    ) {

      loadingMessage.remove();
    }


    logError(
      'HOTELS',
      'Hotel search failed',
      error
    );


    add(
      error.message ||
      'Unable to search hotels right now. Please try again.'
    );

  } finally {

    searchInProgress =
      false;
  }
}


// =========================================================
// HOTEL CARD RENDERING
// =========================================================

function renderHotels(
  hotels
) {

  if (
    !Array.isArray(
      hotels
    ) ||
    !hotels.length
  ) {

    return;
  }


  const wrapper =
    document.createElement(
      'div'
    );


  wrapper.className =
    'hotel-results';


  // =======================================================
  // HOTEL GRID
  // =======================================================

  wrapper.style.display =
    'grid';


  wrapper.style.gridTemplateColumns =
    'repeat(2, minmax(0, 1fr))';


  wrapper.style.gap =
    '20px';


  wrapper.style.width =
    '100%';


  wrapper.style.boxSizing =
    'border-box';


  hotels.forEach(
    (
      hotel,
      index
    ) => {

      const card =
        document.createElement(
          'article'
        );


      card.className =
        'hotel-card';


      // ---------------------------------------------------
      // HOTEL NAME
      // ---------------------------------------------------

      const name =
        hotel.name ||
        'Hotel';


      // ---------------------------------------------------
      // RATING
      // ---------------------------------------------------

      const rating =
        hotel.overall_rating ??
        hotel.rating ??
        'N/A';


      // ---------------------------------------------------
      // REVIEWS
      // ---------------------------------------------------

      const reviews =
        hotel.reviews ??
        hotel.user_ratings_total ??
        '';


      // ---------------------------------------------------
      // PRICE
      // ---------------------------------------------------

      let price =
        'Price unavailable';


      let beforeTaxesPrice =
        '';


      if (
        hotel.rate_per_night
      ) {

        if (
          typeof hotel.rate_per_night ===
          'object'
        ) {

          price =
            hotel.rate_per_night.lowest ||
            (
              hotel.rate_per_night.extracted_lowest !==
              undefined
                ? String(
                    hotel.rate_per_night.extracted_lowest
                  )
                : 'Price unavailable'
            );


          beforeTaxesPrice =
            hotel.rate_per_night.before_taxes_fees ||
            '';

        } else {

          price =
            String(
              hotel.rate_per_night
            );
        }
      }


      if (
        price ===
          'Price unavailable' &&
        hotel.price
      ) {

        price =
          typeof hotel.price ===
          'object'
            ? (
                hotel.price.lowest ||
                (
                  hotel.price.extracted_price !==
                  undefined
                    ? String(
                        hotel.price.extracted_price
                      )
                    : 'Price unavailable'
                )
              )
            : String(
                hotel.price
              );
      }


      // ---------------------------------------------------
      // TOTAL PRICE
      // ---------------------------------------------------

      let totalPrice =
        '';


      if (
        hotel.total_rate
      ) {

        if (
          typeof hotel.total_rate ===
          'object'
        ) {

          totalPrice =
            hotel.total_rate.lowest ||
            (
              hotel.total_rate.extracted_lowest !==
              undefined
                ? String(
                    hotel.total_rate.extracted_lowest
                  )
                : ''
            );

        } else {

          totalPrice =
            String(
              hotel.total_rate
            );
        }
      }


      // ---------------------------------------------------
      // IMAGE
      // ---------------------------------------------------

      let image =
        '';


      if (
        Array.isArray(
          hotel.images
        ) &&
        hotel.images.length
      ) {

        const firstImage =
          hotel.images[0];


        if (
          typeof firstImage ===
          'string'
        ) {

          image =
            firstImage;

        } else if (
          firstImage &&
          typeof firstImage ===
          'object'
        ) {

          image =
            firstImage.thumbnail ||
            firstImage.original_image ||
            '';
        }
      }


      if (
        !image &&
        typeof hotel.thumbnail ===
        'string'
      ) {

        image =
          hotel.thumbnail;
      }


      if (
        !image &&
        typeof hotel.image ===
        'string'
      ) {

        image =
          hotel.image;
      }


      // ---------------------------------------------------
      // ADDRESS
      // ---------------------------------------------------

      let address =
        '';


      if (
        typeof hotel.address ===
        'string'
      ) {

        address =
          hotel.address.trim();

      } else if (
        hotel.address &&
        typeof hotel.address ===
        'object'
      ) {

        address =
          hotel.address.formatted ||
          hotel.address.full ||
          hotel.address.display_name ||
          '';

      }


      if (
        !address &&
        typeof hotel.formatted_address ===
        'string'
      ) {

        address =
          hotel.formatted_address.trim();
      }


      if (
        !address &&
        typeof hotel.display_address ===
        'string'
      ) {

        address =
          hotel.display_address.trim();
      }


      if (
        !address &&
        typeof hotel.vicinity ===
        'string'
      ) {

        address =
          hotel.vicinity.trim();
      }


      if (
        !address &&
        typeof hotel.location ===
        'string'
      ) {

        address =
          hotel.location.trim();
      }


      // ---------------------------------------------------
      // HOTEL CLASS
      // ---------------------------------------------------

      const hotelClass =
        hotel.hotel_class ||
        (
          hotel.extracted_hotel_class
            ? `${hotel.extracted_hotel_class}-star hotel`
            : ''
        );


      // ---------------------------------------------------
      // CHECK-IN / CHECK-OUT
      // ---------------------------------------------------

      const checkInTime =
        hotel.check_in_time ||
        '';


      const checkOutTime =
        hotel.check_out_time ||
        '';


      // ---------------------------------------------------
      // AMENITIES
      // ---------------------------------------------------

      let amenities =
        '';


      if (
        Array.isArray(
          hotel.amenities
        )
      ) {

        amenities =
          hotel.amenities
            .filter(
              item =>
                typeof item ===
                'string'
            )
            .slice(
              0,
              4
            )
            .join(
              ' • '
            );
      }


      // ---------------------------------------------------
      // HOTEL LINK
      // ---------------------------------------------------

      const hotelLink =
        typeof hotel.link ===
        'string'
          ? hotel.link
          : (
              typeof hotel.hotel_link ===
              'string'
                ? hotel.hotel_link
                : ''
            );


      // ---------------------------------------------------
      // CARD HTML
      // ---------------------------------------------------

      card.innerHTML = `
        ${
          image
            ? `
              <div class="hotel-card-image">

                <img
                  src="${esc(image)}"
                  alt="${esc(name)}"
                  loading="lazy"
                >

              </div>
            `
            : ''
        }


        <div class="hotel-card-body">

          <h3 class="hotel-card-title">
            ${esc(name)}
          </h3>


          ${
            hotelClass
              ? `
                <div class="hotel-card-class">
                  ${esc(hotelClass)}
                </div>
              `
              : ''
          }


          ${
            address
              ? `
                <div class="hotel-card-address">
                  📍 ${esc(address)}
                </div>
              `
              : `
                <div class="hotel-card-address hotel-card-address-unavailable">
                  📍 Address not available in this hotel result
                </div>
              `
          }


          <div class="hotel-card-meta">

            <span>
              ⭐ ${esc(rating)}
            </span>


            ${
              reviews
                ? `
                  <span>
                    ${esc(reviews)} reviews
                  </span>
                `
                : ''
            }

          </div>


          <div class="hotel-card-price">

            ${esc(price)}

            <span class="hotel-price-label">
              / night
            </span>

          </div>


          ${
            beforeTaxesPrice &&
            beforeTaxesPrice !== price
              ? `
                <div class="hotel-card-price-note">
                  Before taxes & fees: ${esc(
                    beforeTaxesPrice
                  )}
                </div>
              `
              : ''
          }


          ${
            totalPrice
              ? `
                <div class="hotel-card-total">
                  Total stay: ${esc(totalPrice)}
                </div>
              `
              : ''
          }


          ${
            checkInTime ||
            checkOutTime
              ? `
                <div class="hotel-card-times">

                  ${
                    checkInTime
                      ? `
                        <span>
                          Check-in: ${esc(
                            checkInTime
                          )}
                        </span>
                      `
                      : ''
                  }

                  ${
                    checkOutTime
                      ? `
                        <span>
                          Check-out: ${esc(
                            checkOutTime
                          )}
                        </span>
                      `
                      : ''
                  }

                </div>
              `
              : ''
          }


          ${
            amenities
              ? `
                <div class="hotel-card-amenities">
                  ${esc(amenities)}
                </div>
              `
              : ''
          }


          <div class="hotel-card-actions">

            ${
              hotelLink
                ? `
                  <a
                    class="hotel-view-link"
                    href="${esc(hotelLink)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View hotel
                  </a>
                `
                : ''
            }


            <button
              type="button"
              class="hotel-book-button"
              data-hotel-index="${index}"
            >
              View Prices
            </button>

          </div>

        </div>
      `;


const bookButton =
  card.querySelector(
    '.hotel-book-button'
  );


if (
  bookButton
) {

  bookButton.addEventListener(
    'click',
    () => {

      const params =
        new URLSearchParams();

      // Hotel information
      params.set(
        'name',
        String(name)
      );

      params.set(
        'address',
        String(address)
      );

      params.set(
        'price',
        String(price)
      );

      // Search information
      if (
        context.location
      ) {

        params.set(
          'location',
          String(
            context.location
          )
        );

      }

      if (
        context.checkIn
      ) {

        params.set(
          'check_in',
          String(
            context.checkIn
          )
        );

      }

      if (
        context.checkOut
      ) {

        params.set(
          'check_out',
          String(
            context.checkOut
          )
        );

      }

      params.set(
        'adults',
        String(
          context.adults
        )
      );

      params.set(
        'children',
        String(
          context.children
        )
      );

      params.set(
        'rooms',
        String(
          context.rooms
        )
      );

      // SerpApi property identifier
      if (
        hotel.property_token
      ) {

        params.set(
          'property_token',
          String(
            hotel.property_token
          )
        );

      }

      /*
       * Keep the existing hotel link available
       * for the comparison page.
       */
      if (
        hotelLink
      ) {

        params.set(
          'link',
          String(
            hotelLink
          )
        );

      }

      /*
       * Open StayMate price comparison page.
       */
      window.open(
        `/compare-prices?${params.toString()}`,
        '_blank',
        'noopener,noreferrer'
      );

    }
  );

}


      wrapper.appendChild(
        card
      );
      
    }
  );


  // -------------------------------------------------------
  // RESPONSIVE GRID
  // -------------------------------------------------------

  if (
    !document.getElementById(
      'staymate-hotel-grid-style'
    )
  ) {

    const style =
      document.createElement(
        'style'
      );


    style.id =
      'staymate-hotel-grid-style';


    style.textContent = `
      .hotel-results {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 20px !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      .hotel-results .hotel-card {
        min-width: 0;
        width: 100%;
        box-sizing: border-box;
      }

      .hotel-results .hotel-card-image {
        width: 100%;
        overflow: hidden;
      }

      .hotel-results .hotel-card-image img {
        display: block;
        width: 100%;
        height: 190px;
        object-fit: cover;
      }

      .hotel-results .hotel-card-address {
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .hotel-results .hotel-card-price {
        font-weight: 700;
      }

      .hotel-results .hotel-price-label {
        font-weight: 400;
        font-size: 0.85em;
      }

      .hotel-results .hotel-card-address-unavailable {
        opacity: 0.7;
      }

      .hotel-results .hotel-card-amenities {
        line-height: 1.4;
      }

      @media (max-width: 700px) {
        .hotel-results {
          grid-template-columns: 1fr !important;
        }
      }
    `;


    document.head.appendChild(
      style
    );
  }


  chat.appendChild(
    wrapper
  );


  chat.scrollTop =
    chat.scrollHeight;

  scrollToStayMateSection(wrapper);
}


// =========================================================
// END OF PART 1
// =========================================================

// =========================================================
// LOAD MORE
// =========================================================

function renderLoadMoreButton() {

  const existing =
    chat.querySelector(
      '.load-more-hotels'
    );


  if (
    existing
  ) {

    existing.remove();
  }


  const button =
    document.createElement(
      'button'
    );


  button.type =
    'button';


  button.className =
    'load-more-hotels';


  button.textContent =
    'Load more hotels';


  button.addEventListener(
    'click',
    async () => {

      button.disabled =
        true;


      await search(
        true
      );


      button.remove();
    }
  );


  chat.appendChild(
    button
  );


  chat.scrollTop =
    chat.scrollHeight;
}


// =========================================================
// BOOKING STATE
// =========================================================

// =========================================================
// BOOKING STATE
// =========================================================

let selectedHotel =
  null;


let bookingData = {

  name:
    '',

  phone:
    '',

  checkIn:
    null,

  checkOut:
    null,

  adults:
    2,

  children:
    0,

  rooms:
    1,

  roomType:
    null
};


// =========================================================
// START BOOKING
// =========================================================
//
// Flow:
//
// Book this hotel
//      ↓
// Booking Details
//      ↓
// Continue
//      ↓
// Billing
//      ↓
// Continue to Payment
//      ↓
// Payment Method
//      ↓
// Pay Now
//      ↓
// /api/bookings
//      ↓
// Confirmation
//
// IMPORTANT:
// Payment method is NOT collected here.
// =========================================================

function startBooking(
  hotel
) {

  selectedHotel =
    hotel;


  // -------------------------------------------------------
  // Get hotel rate
  // -------------------------------------------------------

  let rate =
    '';


  if (
    hotel.rate_per_night
  ) {

    if (
      typeof hotel.rate_per_night ===
      'object'
    ) {

      rate =
        hotel.rate_per_night.extracted_lowest ??
        hotel.rate_per_night.lowest ??
        '';

    } else {

      rate =
        hotel.rate_per_night;
    }
  }


  if (
    !rate &&
    hotel.price
  ) {

    if (
      typeof hotel.price ===
      'object'
    ) {

      rate =
        hotel.price.extracted_price ??
        hotel.price.lowest ??
        '';

    } else {

      rate =
        hotel.price;
    }
  }


  // -------------------------------------------------------
  // Room type
  // -------------------------------------------------------

  let roomType =
    'Standard';


  if (
    typeof hotel.room_type ===
    'string' &&
    hotel.room_type.trim()
  ) {

    roomType =
      hotel.room_type.trim();

  } else if (
    typeof context.roomType ===
    'string' &&
    context.roomType.trim()
  ) {

    roomType =
      context.roomType.trim();
  }


  // -------------------------------------------------------
  // Booking data
  // -------------------------------------------------------

  bookingData = {

    name:
      '',

    phone:
      '',

    checkIn:
      context.checkIn,

    checkOut:
      context.checkOut,

    adults:
      context.adults || 2,

    children:
      context.children || 0,

    rooms:
      context.rooms || 1,

    roomType:
      roomType
  };


  // -------------------------------------------------------
  // Remove previous booking UI
  // -------------------------------------------------------

  removeExistingBookingUI('.booking-container, .billing-container, .payment-container');


  // -------------------------------------------------------
  // Booking container
  // -------------------------------------------------------

  const bookingContainer =
    document.createElement(
      'div'
    );


  bookingContainer.className =
    'message bot booking-container';


  bookingContainer.innerHTML = `

    <div class="bubble card booking-card">

      <span class="section-eyebrow">
        ✦ BOOKING DETAILS
      </span>


      <h2>
        Book Your Stay
      </h2>


      <p class="muted">
        ${esc(
          hotel.name ||
          'Selected Hotel'
        )}
      </p>


      <form class="booking-form">

        <div class="booking-grid">

          <!-- Guest Name -->

          <div class="booking-field">

            <label>
              Guest Name
            </label>

            <input
              type="text"
              name="name"
              autocomplete="name"
              required
            >

          </div>


          <!-- Mobile -->

          <div class="booking-field">

            <label>
              Mobile Number
            </label>

            <input
              type="tel"
              name="mobile"
              autocomplete="tel"
              inputmode="numeric"
              maxlength="10"
              required
            >

          </div>

          <!-- Check-in -->

          <div class="booking-field">

            <label>
              Check-in
            </label>

            <input
              type="date"
              name="checkIn"
              value="${esc(
                bookingData.checkIn ||
                ''
              )}"
              required
            >

          </div>


          <!-- Check-out -->

          <div class="booking-field">

            <label>
              Check-out
            </label>

            <input
              type="date"
              name="checkOut"
              value="${esc(
                bookingData.checkOut ||
                ''
              )}"
              required
            >

          </div>


          <!-- Adults -->

          <div class="booking-field">

            <label>
              Adults
            </label>

            <input
              type="number"
              name="adults"
              min="1"
              value="${esc(
                bookingData.adults
              )}"
              required
            >

          </div>


          <!-- Children -->

          <div class="booking-field">

            <label>
              Children
            </label>

            <input
              type="number"
              name="children"
              min="0"
              value="${esc(
                bookingData.children
              )}"
              required
            >

          </div>


          <!-- Rooms -->

          <div class="booking-field">

            <label>
              Rooms
            </label>

            <input
              type="number"
              name="rooms"
              min="1"
              value="${esc(
                bookingData.rooms
              )}"
              required
            >

          </div>


          <!-- Room Type -->

          <div class="booking-field">

            <label>
              Room Type
            </label>

            <select
              name="roomType"
              required
            >

              <option value="Standard">
                Standard
              </option>

              <option value="Deluxe">
                Deluxe
              </option>

              <option value="Double Room">
                Double Room
              </option>

              <option value="Suite">
                Suite
              </option>

            </select>

          </div>

        </div>


        <div class="actions">

          <button
            type="submit"
            class="primary"
          >
            Continue
          </button>


          <button
            type="button"
            class="secondary cancel-booking"
          >
            Cancel
          </button>

        </div>

      </form>

    </div>

  `;


  appendBookingFlowUI(bookingContainer);
  if (window.__stayMateAssistantBookingFlow === true && typeof smAiOpen === 'function') {
    smAiOpen();
  } else {
    scrollToStayMateSection(bookingContainer);
  }


  // -------------------------------------------------------
  // Set room type
  // -------------------------------------------------------

  const roomTypeSelect =
    bookingContainer.querySelector(
      '[name="roomType"]'
    );


  if (
    roomTypeSelect
  ) {

    const option =
      Array.from(
        roomTypeSelect.options
      ).find(
        item =>
          item.value.toLowerCase() ===
          roomType.toLowerCase()
      );


    if (
      option
    ) {

      roomTypeSelect.value =
        option.value;
    }
  }


  // -------------------------------------------------------
  // Booking form submit
  // -------------------------------------------------------

  const bookingForm =
    bookingContainer.querySelector(
      '.booking-form'
    );


  bookingForm.addEventListener(
    'submit',
    event => {

      event.preventDefault();


      const formData =
        new FormData(
          bookingForm
        );


      const guestName =
        String(
          formData.get(
            'name'
          ) ||
          ''
        ).trim();


      const mobile =
        String(
          formData.get(
            'mobile'
          ) ||
          ''
        ).trim();


      const email =
        String(
          formData.get(
            'email'
          ) ||
          ''
        ).trim();


      const checkIn =
        String(
          formData.get(
            'checkIn'
          ) ||
          ''
        ).trim();


      const checkOut =
        String(
          formData.get(
            'checkOut'
          ) ||
          ''
        ).trim();


      const adults =
        Number(
          formData.get(
            'adults'
          )
        );


      const children =
        Number(
          formData.get(
            'children'
          )
        );


      const rooms =
        Number(
          formData.get(
            'rooms'
          )
        );


      const roomType =
        String(
          formData.get(
            'roomType'
          ) ||
          ''
        ).trim();


      // ---------------------------------------------------
      // VALIDATION
      // ---------------------------------------------------

      if (
        !guestName
      ) {

        add(
          'Please enter the guest name.'
        );


        return;
      }


      if (
        !/^\d{10}$/.test(
          mobile
        )
      ) {

        add(
          'Please enter a valid 10-digit mobile number.'
        );


        return;
      }


      if (
        !validDateRange(
          checkIn,
          checkOut
        )
      ) {

        add(
          'Please select a valid check-in and check-out date.'
        );


        return;
      }


      if (
        !Number.isInteger(
          adults
        ) ||
        adults < 1
      ) {

        add(
          'Number of adults must be at least 1.'
        );


        return;
      }


      if (
        !Number.isInteger(
          children
        ) ||
        children < 0
      ) {

        add(
          'Number of children cannot be negative.'
        );


        return;
      }


      if (
        !Number.isInteger(
          rooms
        ) ||
        rooms < 1
      ) {

        add(
          'Number of rooms must be at least 1.'
        );


        return;
      }


      if (
        !roomType
      ) {

        add(
          'Please select a room type.'
        );


        return;
      }


      // ---------------------------------------------------
      // Save booking details
      // ---------------------------------------------------

      bookingData = {

        name:
          guestName,

        phone:
          mobile,

        email:
          email,

        checkIn:
          checkIn,

        checkOut:
          checkOut,

        adults:
          adults,

        children:
          children,

        rooms:
          rooms,

        roomType:
          roomType
      };


      context.adults =
        adults;


      context.children =
        children;


      context.rooms =
        rooms;


      context.checkIn =
        checkIn;


      context.checkOut =
        checkOut;


      context.roomType =
        roomType;


      logInfo(
        'BOOKING',
        `DETAILS hotel="${hotel.name || ''}" adults=${adults} children=${children} rooms=${rooms}`
      );


      bookingContainer.remove();


      // ---------------------------------------------------
      // Go to Billing
      // ---------------------------------------------------

      showBillingPage(
        hotel,
        {
          guestName:
            guestName,

          mobile:
            mobile,

          adults:
            adults,

          children:
            children,

          rooms:
            rooms,

          checkIn:
            checkIn,

          checkOut:
            checkOut,

          roomType:
            roomType
        },
        rate
      );
    }
  );


  // -------------------------------------------------------
  // Cancel
  // -------------------------------------------------------

  const cancelButton =
    bookingContainer.querySelector(
      '.cancel-booking'
    );


  cancelButton.addEventListener(
    'click',
    () => {

      bookingContainer.remove();


      selectedHotel =
        null;


      if (window.__stayMateAssistantBookingFlow === true) {
        if (typeof smAiAddMessage === 'function') {
          smAiAddMessage('Booking cancelled. You can choose another hotel whenever you are ready.', 'bot');
        }
        window.__stayMateAssistantBookingFlow = false;
      }

      bookingData = {

        name:
          '',

        phone:
          '',

        email:
          '',

        checkIn:
          null,

        checkOut:
          null,

        adults:
          2,

        children:
          0,

        rooms:
          1,

        roomType:
          null
      };
    }
  );
}


// =========================================================
// BILLING PAGE
// =========================================================

function showBillingPage(
  hotel,
  bookingDetails,
  rate
) {

  rate =
    Number(
      rate
    );


  if (
    !Number.isFinite(
      rate
    ) ||
    rate <= 0
  ) {

    add(
      'The selected hotel does not have a valid price available for booking.'
    );


    return;
  }


  const start =
    new Date(
      `${bookingDetails.checkIn}T00:00:00`
    );


  const end =
    new Date(
      `${bookingDetails.checkOut}T00:00:00`
    );


  const nights =
    Math.round(
      (
        end -
        start
      ) /
      (
        1000 *
        60 *
        60 *
        24
      )
    );


  if (
    nights < 1
  ) {

    add(
      'The stay must be at least one night.'
    );


    return;
  }


  // -------------------------------------------------------
  // BILLING CALCULATION
  // -------------------------------------------------------

  const subtotal =
    rate *
    nights *
    bookingDetails.rooms;


  const tax =
    subtotal *
    0.12;


  const total =
    subtotal +
    tax;


  // -------------------------------------------------------
  // Billing container
  // -------------------------------------------------------

  const billingContainer =
    document.createElement(
      'div'
    );


  billingContainer.className =
    'message bot billing-container';


  billingContainer.innerHTML = `

    <div class="bubble card billing-card">

      <span class="section-eyebrow">
        ✦ BILLING
      </span>


      <h2>
        Booking Summary
      </h2>


      <p class="muted">
        Please verify your booking details before payment.
      </p>


      <div class="billing-summary">

        <div class="billing-row">

          <span>
            Hotel
          </span>

          <strong>
            ${esc(
              hotel.name ||
              'Hotel'
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Guest
          </span>

          <strong>
            ${esc(
              bookingDetails.guestName
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Mobile
          </span>

          <strong>
            ${esc(
              bookingDetails.mobile
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Email
          </span>

          <strong>
            ${esc(
              bookingDetails.email
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Room Type
          </span>

          <strong>
            ${esc(
              bookingDetails.roomType
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Check-in
          </span>

          <strong>
            ${esc(
              bookingDetails.checkIn
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Check-out
          </span>

          <strong>
            ${esc(
              bookingDetails.checkOut
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Nights
          </span>

          <strong>
            ${nights}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Adults
          </span>

          <strong>
            ${bookingDetails.adults}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Children
          </span>

          <strong>
            ${bookingDetails.children}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Rooms
          </span>

          <strong>
            ${bookingDetails.rooms}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Rate / Night
          </span>

          <strong>
            ${money(
              rate
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Subtotal
          </span>

          <strong>
            ${money(
              subtotal
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Tax (12%)
          </span>

          <strong>
            ${money(
              tax
            )}
          </strong>

        </div>


        <div class="billing-row billing-total">

          <span>
            Total Amount
          </span>

          <strong>
            ${money(
              total
            )}
          </strong>

        </div>

      </div>


      <div class="actions">

        <button
          type="button"
          class="primary proceed-payment"
        >
          Continue to Payment
        </button>


        <button
          type="button"
          class="secondary back-booking"
        >
          Back
        </button>

      </div>

    </div>

  `;


  appendBookingFlowUI(billingContainer);


  // -------------------------------------------------------
  // Continue to Payment
  // -------------------------------------------------------

  const paymentButton =
    billingContainer.querySelector(
      '.proceed-payment'
    );


  paymentButton.addEventListener(
    'click',
    () => {

      billingContainer.remove();


      showPaymentPage(
        hotel,
        bookingDetails,
        rate,
        nights,
        subtotal,
        tax,
        total
      );
    }
  );


  // -------------------------------------------------------
  // Back to booking
  // -------------------------------------------------------

  const backButton =
    billingContainer.querySelector(
      '.back-booking'
    );


  backButton.addEventListener(
    'click',
    () => {

      billingContainer.remove();


      startBooking(
        hotel
      );
    }
  );
}


// =========================================================
// PAYMENT PAGE
// =========================================================
//
// Payment methods:
//
// UPI
// Credit / Debit Card
// Net Banking
//
// No dropdown.
// =========================================================

function showPaymentPage(
  hotel,
  bookingDetails,
  rate,
  nights,
  subtotal,
  tax,
  total
) {

  const paymentContainer =
    document.createElement(
      'div'
    );


  paymentContainer.className =
    'message bot payment-container';


  paymentContainer.innerHTML = `

    <div class="bubble card payment-card">

      <span class="section-eyebrow">
        ✦ PAYMENT
      </span>


      <h2>
        Choose Payment Method
      </h2>


      <p>
        Amount payable:
        <strong>
          ${money(
            total
          )}
        </strong>
      </p>


      <div class="payment-summary">

        <div class="billing-row">

          <span>
            Hotel
          </span>

          <strong>
            ${esc(
              hotel.name ||
              'Hotel'
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Guest
          </span>

          <strong>
            ${esc(
              bookingDetails.guestName
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Check-in
          </span>

          <strong>
            ${esc(
              bookingDetails.checkIn
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Check-out
          </span>

          <strong>
            ${esc(
              bookingDetails.checkOut
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Rooms
          </span>

          <strong>
            ${bookingDetails.rooms}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Total
          </span>

          <strong>
            ${money(
              total
            )}
          </strong>

        </div>

      </div>


      <form class="payment-form">

        <div class="payment-methods">


          <!-- UPI -->

          <label
            class="payment-option"
            tabindex="0"
          >

            <input
              type="radio"
              name="paymentMethod"
              value="UPI"
              required
            >

            <span>
              UPI
            </span>

          </label>


          <!-- CARD -->

          <label
            class="payment-option"
            tabindex="0"
          >

            <input
              type="radio"
              name="paymentMethod"
              value="Credit / Debit Card"
            >

            <span>
              Credit / Debit Card
            </span>

          </label>


          <!-- NET BANKING -->

          <label
            class="payment-option"
            tabindex="0"
          >

            <input
              type="radio"
              name="paymentMethod"
              value="Net Banking"
            >

            <span>
              Net Banking
            </span>

          </label>


        </div>


        <p class="payment-note muted">

          🔒 This project currently uses demo payment processing.

        </p>


        <div class="actions">

          <button
            type="submit"
            class="primary"
          >
            Pay & Confirm Booking
          </button>


          <button
            type="button"
            class="secondary back-payment"
          >
            Back to Billing
          </button>

        </div>

      </form>

    </div>

  `;


  appendBookingFlowUI(paymentContainer);


  // -------------------------------------------------------
  // Payment option styling
  // -------------------------------------------------------

  const paymentOptions =
    paymentContainer.querySelectorAll(
      '.payment-option'
    );


  paymentOptions.forEach(
    option => {

      const radio =
        option.querySelector(
          'input[type="radio"]'
        );


      option.addEventListener(
        'click',
        () => {

          paymentOptions.forEach(
            item => {

              item.classList.remove(
                'selected'
              );
            }
          );


          radio.checked =
            true;


          option.classList.add(
            'selected'
          );
        }
      );


      option.addEventListener(
        'keydown',
        event => {

          if (
            event.key ===
              'Enter' ||
            event.key ===
              ' '
          ) {

            event.preventDefault();


            paymentOptions.forEach(
              item => {

                item.classList.remove(
                  'selected'
                );
              }
            );


            radio.checked =
              true;


            option.classList.add(
              'selected'
            );
          }
        }
      );


      radio.addEventListener(
        'change',
        () => {

          paymentOptions.forEach(
            item => {

              item.classList.remove(
                'selected'
              );
            }
          );


          if (
            radio.checked
          ) {

            option.classList.add(
              'selected'
            );
          }
        }
      );
    }
  );


  // -------------------------------------------------------
  // Payment submit
  // -------------------------------------------------------

  const paymentForm =
    paymentContainer.querySelector(
      '.payment-form'
    );


  paymentForm.addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      const selectedPayment =
        paymentContainer.querySelector(
          'input[name="paymentMethod"]:checked'
        );


      const paymentMethod =
        selectedPayment?.value ||
        '';


      if (
        !paymentMethod
      ) {

        add(
          'Please select a payment method.'
        );


        return;
      }


      const payButton =
        paymentForm.querySelector(
          'button[type="submit"]'
        );


      payButton.disabled =
        true;


      payButton.textContent =
        'Processing...';


      logInfo(
        'BOOKING',
        `PAYMENT method="${paymentMethod}"`
      );


      try {

        // -------------------------------------------------
        // FINAL BOOKING REQUEST
        // -------------------------------------------------
        //
        // These field names match the Flask backend.
        //
        // IMPORTANT:
        // num_persons = adults only.
        // Children are sent separately.
        //
        // -------------------------------------------------

        const result =
          await post(
            '/api/bookings',
            {

              hotel_name:
                hotel.name ||
                '',


              hotel_address:
                hotel.address ||
                hotel.formatted_address ||
                '',


              hotel_lat:
                hotel.gps_coordinates
                  ?.latitude ??
                hotel.latitude ??
                hotel.lat ??
                null,


              hotel_lon:
                hotel.gps_coordinates
                  ?.longitude ??
                hotel.longitude ??
                hotel.lon ??
                null,


              provider_name:
                hotel.provider ||
                hotel.provider_name ||
                hotel.cheapest_offer
                  ?.source ||
                '',


              provider_url:
                hotel.link ||
                hotel.provider_url ||
                hotel.booking_link ||
                hotel.bookingLink ||
                '',


              guest_name:
                bookingDetails.guestName,


              mobile:
                bookingDetails.mobile,


              check_in:
                bookingDetails.checkIn,


              check_out:
                bookingDetails.checkOut,


              // IMPORTANT:
              // Adults only.
              num_persons:
                bookingDetails.adults,


              num_children:
                bookingDetails.children,


              num_rooms:
                bookingDetails.rooms,


              room_type:
                bookingDetails.roomType,


              price_per_night:
                rate,


              nights:
                nights,


              subtotal:
                subtotal,


              tax:
                tax,


              total_amount:
                total,


              payment_method:
                paymentMethod,


              payment_status:
                'paid',


              booking_status:
                'confirmed'
            }
          );


        paymentContainer.remove();


        showConfirmation(
          result
        );


      } catch (
        error
      ) {

        logError(
          'BOOKING',
          'Payment/booking failed',
          error
        );


        add(
          error.message ||
          'Unable to complete the booking.'
        );


        payButton.disabled =
          false;


        payButton.textContent =
          'Pay & Confirm Booking';
      }
    }
  );


  // -------------------------------------------------------
  // Back to Billing
  // -------------------------------------------------------

  const backButton =
    paymentContainer.querySelector(
      '.back-payment'
    );


  backButton.addEventListener(
    'click',
    () => {

      paymentContainer.remove();


      showBillingPage(
        hotel,
        bookingDetails,
        rate
      );
    }
  );
}


// =========================================================
// BOOKING CONFIRMATION
// =========================================================

function showConfirmation(
  result
) {

  const booking =
    result?.booking ||
    result ||
    {};

  // Assistant-origin bookings show their final confirmation only in the
  // floating assistant. The existing booking API and validation are reused.
  if (window.__stayMateAssistantBookingFlow === true) {
    const reference = booking.booking_reference || booking.reference || 'N/A';
    const hotelName = booking.hotel_name || selectedHotel?.name || 'Your selected hotel';
    const checkInDate = booking.check_in || bookingData.checkIn || context.checkIn || 'N/A';
    const checkOutDate = booking.check_out || bookingData.checkOut || context.checkOut || 'N/A';
    const totalAmount = booking.total_amount ?? 0;
    const confirmationText =
      `🎉 Booking confirmed!\n\n` +
      `${result?.message || 'Your hotel booking has been confirmed successfully.'}\n\n` +
      `Hotel: ${hotelName}\n` +
      `Booking reference: ${reference}\n` +
      `Check-in: ${checkInDate}\n` +
      `Check-out: ${checkOutDate}\n` +
      `Payment status: ${booking.payment_status || 'paid'}\n` +
      `Total paid: ${typeof money === 'function' ? money(totalAmount) : totalAmount}`;

    if (typeof smAiAddMessage === 'function') {
      smAiAddMessage(confirmationText, 'bot');
      if (typeof smAiOpen === 'function') smAiOpen();
    }
    window.__stayMateAssistantBookingFlow = false;
    try { localStorage.removeItem('staymate_ai_restore_on_return'); } catch (_) {}
    awaiting = null;
    return;
  }

  const confirmationContainer =
    document.createElement(
      'div'
    );


  confirmationContainer.className =
    'message bot confirmation-container';


  confirmationContainer.innerHTML = `

    <div class="bubble card confirmation-card">

      <span class="section-eyebrow">
        ✦ CONFIRMED
      </span>


      <h2>
        🎉 Booking Confirmed!
      </h2>


      <p class="success">
        ${esc(
          result?.message ||
          'Your hotel booking has been confirmed successfully.'
        )}
      </p>


      <div class="confirmation-details">

        <div class="billing-row">

          <span>
            Booking Reference
          </span>

          <strong>
            ${esc(
              booking.booking_reference ||
              booking.reference ||
              ''
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Hotel
          </span>

          <strong>
            ${esc(
              booking.hotel_name ||
              selectedHotel?.name ||
              ''
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Guest
          </span>

          <strong>
            ${esc(
              booking.guest_name ||
              bookingData.name ||
              ''
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Mobile
          </span>

          <strong>
            ${esc(
              booking.mobile ||
              bookingData.phone ||
              ''
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Email
          </span>

          <strong>
            ${esc(
              booking.email ||
              bookingData.email ||
              ''
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Check-in
          </span>

          <strong>
            ${esc(
              booking.check_in ||
              bookingData.checkIn ||
              ''
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Check-out
          </span>

          <strong>
            ${esc(
              booking.check_out ||
              bookingData.checkOut ||
              ''
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Adults
          </span>

          <strong>
            ${esc(
              booking.num_persons ??
              bookingData.adults ??
              ''
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Children
          </span>

          <strong>
            ${esc(
              booking.num_children ??
              bookingData.children ??
              0
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Rooms
          </span>

          <strong>
            ${esc(
              booking.num_rooms ??
              bookingData.rooms ??
              ''
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Room Type
          </span>

          <strong>
            ${esc(
              booking.room_type ||
              bookingData.roomType ||
              ''
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Payment Method
          </span>

          <strong>
            ${esc(
              booking.payment_method ||
              ''
            )}
          </strong>

        </div>


        <div class="billing-row">

          <span>
            Payment Status
          </span>

          <strong>
            ${esc(
              booking.payment_status ||
              'paid'
            )}
          </strong>

        </div>


        <div class="billing-row billing-total">

          <span>
            Total Paid
          </span>

          <strong>
            ${money(
              booking.total_amount ||
              0
            )}
          </strong>

        </div>

      </div>


      <p class="muted">
        Please keep your booking reference for future reference.
      </p>

    </div>

  `;


  chat.appendChild(
    confirmationContainer
  );


  chat.scrollTop =
    chat.scrollHeight;


  logInfo(
    'BOOKING',
    `CONFIRMED reference="${
      booking.booking_reference ||
      booking.reference ||
      ''
    }"`
  );


  // Keep selected hotel available for the
  // current confirmation, but stop booking state.
  awaiting =
    null;
}

// =========================================================
// CHAT FORM SUBMIT
// =========================================================

if (
  form
) {

  form.addEventListener(
    'submit',
    async event => {

      event.preventDefault();


      const text =
        input.value.trim();


      if (
        !text
      ) {

        return;
      }


      add(
        text,
        'user'
      );


      input.value =
        '';


      try {

        


        // ---------------------------------------------------
        // HOTEL SEARCH COMMAND
        // ---------------------------------------------------
        //
        // IMPORTANT FIX:
        //
        // "Find hotels in Chittoor"
        //
        // must NOT call startHotelSearch()
        // because that would trigger GPS/IP.
        //
        // First extract the explicit destination.
        //
        // Only if there is NO destination do we
        // use automatic location.
        //
        // ---------------------------------------------------

       // ---------------------------------------------------
// HOTEL SEARCH COMMAND
// ---------------------------------------------------

if (
  /^(find|show|search|get).*(hotel|hotels)/i.test(
    text
  )
) {

  // -------------------------------------------------
  // EXPLICIT DESTINATION
  //
  // Example:
  // "Find hotels in Chittoor"
  // "Search hotels near Tirupati"
  //
  // These must use the typed destination.
  // -------------------------------------------------

  
const isNearMeRequest =
  /\b(?:near me|around me|close to me|nearby|my current location|current location)\b/i.test(text);

const explicitLocation =
  isNearMeRequest
    ? null
    : parseLocation(text);



  if (
    explicitLocation
  ) {

    logInfo(
      'LOCATION',
      `CHAT explicit location="${explicitLocation}"`
    );


    await selectLocationText(
      explicitLocation
    );


    return;
  }


  // -------------------------------------------------
  // NO EXPLICIT DESTINATION
  //
  // Example:
  // "Find hotels"
  //
  // Use:
  // GPS → reverse geocoding → IP fallback
  // -------------------------------------------------

  // IMPORTANT:
  // Clear any previous search location so that
  // automaticLocation() does not reuse an old city.

  context.location =
    null;


  userCoords =
    null;


  if (
    locationSearch
  ) {

    locationSearch.value =
      '';
  }


  clearLocationResults();


  await startHotelSearch();


  return;
}


        // ---------------------------------------------------
        // LOCATION WAITING STATE
        // ---------------------------------------------------

        if (
          awaiting ===
          'location'
        ) {

          await processAnswer(
            text
          );


          return;
        }


        // ---------------------------------------------------
        // NLP
        // ---------------------------------------------------

        const nlp =
          await post(
            '/api/nlp',
            {
              text
            }
          );


        if (
          nlp?.location
        ) {

          context.location =
            nlp.location;


          if (
            locationSearch
          ) {

            locationSearch.value =
              nlp.location;
          }


          clearLocationResults();


          userCoords =
            null;
        }


        if (
          nlp?.check_in
        ) {

          context.checkIn =
            nlp.check_in;
        }


        if (
          nlp?.check_out
        ) {

          context.checkOut =
            nlp.check_out;
        }


        if (
          nlp?.guests
        ) {

          if (
            nlp.guests.adults
          ) {

            context.adults =
              nlp.guests.adults;
          }


          if (
            nlp.guests.children !==
            undefined
          ) {

            context.children =
              nlp.guests.children;
          }
        }


        if (
          nlp?.rooms
        ) {

          context.rooms =
            nlp.rooms;
        }


        if (
          nlp?.room_type
        ) {

          context.roomType =
            nlp.room_type;
        }


        // ---------------------------------------------------
        // SEARCH USING NLP LOCATION
        // ---------------------------------------------------

        if (
          context.location
        ) {

          if (
            !validDateRange(
              context.checkIn,
              context.checkOut
            )
          ) {

            setDiscoveryDefaults();
          }


          await search(
            false
          );


          return;
        }


        // ---------------------------------------------------
        // DIRECT LOCATION PARSING
        // ---------------------------------------------------

        const location =
          parseLocation(
            text
          );


        if (
          location
        ) {

          await selectLocationText(
            location
          );


          return;
        }


        // ---------------------------------------------------
        // NORMAL CHAT RESPONSE
        // ---------------------------------------------------

        add(
          "Tell me the city or location where you'd like to find hotels, or type 'Find hotels' to use your current location."
        );

      } catch (
        error
      ) {

        logError(
          'CHAT',
          'Message processing failed',
          error
        );


        add(
          error.message ||
          'Something went wrong. Please try again.'
        );
      }
    }
  );
}

// =========================================================
// GLOBAL SECTION SCROLL MANAGER
// =========================================================

function scrollToStayMateSection(element) {
    if (!element) return;

    setTimeout(() => {
        element.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }, 100);
}

// =========================================================
// NEW SEARCH
// =========================================================

const newChat =
  document.getElementById(
    'newChat'
  );


if (
  newChat
) {

  newChat.addEventListener(
    'click',
    () => {

      context = {

        location:
          null,

        checkIn:
          null,

        checkOut:
          null,

        adults:
          2,

        children:
          0,

        rooms:
          1,

        roomType:
          null
      };


      lastResults =
        [];


      nextPageToken =
        null;


      userCoords =
        null;


      awaiting =
        null;


      selectedHotel =
        null;


      bookingData = {

        name:
          '',

        phone:
          '',

        email:
          '',

        checkIn:
          null,

        checkOut:
          null,

        adults:
          2,

        children:
          0,

        rooms:
          1,

        roomType:
          null,

        pricePerNight:
          '',

        paymentMethod:
          ''
      };


      clearLocationResults();


      if (
        locationSearch
      ) {

        locationSearch.value =
          '';
      }


      if (
        chat
      ) {

        chat.innerHTML =
          '';
      }


      add(
        'What destination would you like to explore?'
      );


      if (
        locationSearch
      ) {

        locationSearch.focus();
      }
    }
  );
}


// =========================================================
// INITIAL MESSAGE
// =========================================================

function initializeChat() {

  if (
    !chat
  ) {

    return;
  }


  if (
    chat.children.length
  ) {

    return;
  }


  add(
    'Welcome to STAYMATE AI! Tell me where you want to stay, or use “Find hotels near me” to search using your current location.'
  );
}


// =========================================================
// HERO DESTINATION BUTTON
// =========================================================
//
// "Search a destination" in index.html simply focuses
// the locationSearch input.
//
// Therefore:
//
// User clicks it
//      ↓
// Input receives focus
//      ↓
// User types destination
//      ↓
// Suggestions appear
//      ↓
// User selects / presses Enter
//      ↓
// selectLocation()
//      ↓
// search()
//
// It does NOT call automaticLocation().
// =========================================================


// =========================================================
// DESTINATION BUTTON SCROLL
// =========================================================

document.addEventListener(
  'click',
  (event) => {

    const target =
      event.target.closest(
        '.secondary-action'
      );


    if (
      target
    ) {

      scrollToDestinationSearch();
    }
  }
);


// =========================================================
// INITIALIZE
// =========================================================

initializeChat();

// =========================================================
// RESTORE DESTINATION SEARCH REQUESTED BY THE AI ASSISTANT
// =========================================================
(function restoreAssistantDestinationSearch() {
  const params = new URLSearchParams(window.location.search);
  const destination = String(params.get('assistant_search') || '').trim();
  if (!destination) return;

  const checkIn = params.get('check_in');
  const checkOut = params.get('check_out');
  const adults = Number(params.get('adults'));
  const children = Number(params.get('children'));
  const rooms = Number(params.get('rooms'));

  if (checkIn) context.checkIn = checkIn;
  if (checkOut) context.checkOut = checkOut;
  if (Number.isFinite(adults) && adults > 0) context.adults = adults;
  if (Number.isFinite(children) && children >= 0) context.children = children;
  if (Number.isFinite(rooms) && rooms > 0) context.rooms = rooms;

  setTimeout(() => selectLocationText(destination), 450);
  params.delete('assistant_search');
  const cleanQuery = params.toString();
  history.replaceState({}, '', window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '') + window.location.hash);
})();

// =========================================================
// RESTORE BOOKING FROM PRICE COMPARISON PAGE
// =========================================================

(function restorePendingBooking() {

  const raw =
    localStorage.getItem(
      'staymate_pending_booking'
    );


  if (
    !raw
  ) {

    return;
  }


  let pending = null;


  try {

    pending =
      JSON.parse(
        raw
      );

  } catch (
    error
  ) {

    console.error(
      'StayMate pending booking data is invalid.',
      error
    );

    localStorage.removeItem(
      'staymate_pending_booking'
    );

    return;
  }


  if (
    !pending ||
    !pending.hotel
  ) {

    localStorage.removeItem(
      'staymate_pending_booking'
    );

    return;
  }


  // Restore search context.
  if (
    pending.context
  ) {

    context.location =
      pending.context.location ||
      context.location;

    context.checkIn =
      pending.context.checkIn ||
      context.checkIn;

    context.checkOut =
      pending.context.checkOut ||
      context.checkOut;

    context.adults =
      Number(
        pending.context.adults
      ) || 2;

    context.children =
      Number(
        pending.context.children
      ) || 0;

    context.rooms =
      Number(
        pending.context.rooms
      ) || 1;
  }


  // Wait until the main StayMate UI is ready.
  setTimeout(
    () => {

      try {

        window.__stayMateAssistantBookingFlow =
          pending.source === 'assistant';

        if (
          window.__stayMateAssistantBookingFlow &&
          typeof smAiRestoreHistory === 'function'
        ) {
          smAiRestoreHistory(false);
          if (typeof smAiOpen === 'function') smAiOpen();
          if (typeof smAiAddMessage === 'function') {
            smAiAddMessage(`Let's complete your booking for ${pending.hotel.name || 'your selected hotel'} here in the assistant.`, 'bot');
          }
        }

        startBooking(
          pending.hotel
        );

      } catch (
        error
      ) {

        console.error(
          'Unable to restore StayMate booking.',
          error
        );

      } finally {

        localStorage.removeItem(
          'staymate_pending_booking'
        );

      }

    },
    300
  );

})();

// =========================================================
// STAYMATE AI KNOWLEDGE ASSISTANT
// RAG MINI CHAT
// =========================================================

const smAiToggle =
  document.getElementById('sm-ai-toggle');

const smAiPanel =
  document.getElementById('sm-ai-panel');

const smAiClose =
  document.getElementById('sm-ai-close');

const smAiMessages =
  document.getElementById('sm-ai-messages');

const smAiForm =
  document.getElementById('sm-ai-form');

const smAiInput =
  document.getElementById('sm-ai-input');

const smAiFaqs =
  document.querySelectorAll('.sm-ai-faq');

  // =========================================================
  // AI ASSISTANT ACTION STATE
  // =========================================================
  
  let smAiPendingCancellation = null;

let smAiCancellationBookings = [];

let smAiCancellationSelectionRequired = false;
  
// =========================================================
// OPEN / CLOSE
// =========================================================

function smAiOpen() {

  if (!smAiPanel || !smAiToggle) {
    return;
  }

  smAiPanel.classList.add('open');

  smAiPanel.setAttribute(
    'aria-hidden',
    'false'
  );

  smAiToggle.setAttribute(
    'aria-expanded',
    'true'
  );

  setTimeout(() => {

    if (smAiInput) {
      smAiInput.focus();
    }

  }, 200);
}


function smAiClosePanel() {

  if (!smAiPanel || !smAiToggle) {
    return;
  }
  // Move focus outside the panel before hiding it.
  if (smAiPanel.contains(document.activeElement)) {
    smAiToggle.focus();
  }
  smAiPanel.classList.remove('open');

  smAiPanel.setAttribute(
    'aria-hidden',
    'true'
  );

  smAiToggle.setAttribute(
    'aria-expanded',
    'false'
  );
}


if (smAiToggle) {

  smAiToggle.addEventListener(
    'click',
    () => {

      if (
        smAiPanel &&
        smAiPanel.classList.contains('open')
      ) {

        smAiClosePanel();

      } else {

        smAiOpen();

      }

    }
  );
}


if (smAiClose) {

  smAiClose.addEventListener(
    'click',
    smAiClosePanel
  );

}


// =========================================================
// ADD MESSAGE
// =========================================================

const smAiHistoryKey = 'staymate_ai_chat_history_v2';
const smAiLegacyHistoryKey = 'staymate_ai_chat_history_v1';
const smAiActiveChatKey = 'staymate_ai_active_chat_v1';
const smAiHistoryButton = document.getElementById('sm-ai-history');
const smAiSessions = [];
let smAiActiveChatId = '';
let smAiSelectedPastChatId = '';
let smAiHistory = [];

function smAiMakeChatId() {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function smAiChatTitle(items) {
  const firstUserMessage = (items || []).find(item => item?.type === 'message' && item.sender === 'user' && item.text);
  return String(firstUserMessage?.text || 'New chat').trim().slice(0, 64);
}

function smAiReadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(smAiHistoryKey) || 'null');
    if (parsed && Array.isArray(parsed.sessions)) {
      smAiSessions.splice(0, smAiSessions.length, ...parsed.sessions.filter(chat => chat && chat.id && Array.isArray(chat.items)));
      smAiActiveChatId = parsed.activeId || localStorage.getItem(smAiActiveChatKey) || '';
    } else {
      // Migrate the previous single-conversation history without discarding it.
      const legacy = JSON.parse(localStorage.getItem(smAiLegacyHistoryKey) || '[]');
      if (Array.isArray(legacy) && legacy.length) {
        const migrated = { id: smAiMakeChatId(), title: smAiChatTitle(legacy), items: legacy.slice(-160), updatedAt: Date.now() };
        smAiSessions.splice(0, smAiSessions.length, migrated);
        smAiActiveChatId = migrated.id;
        smAiWriteSessions();
      }
    }
  } catch (error) {
    console.warn('[STAYMATE][AI HISTORY] Unable to read saved history.', error);
  }
  let active = smAiSessions.find(chat => chat.id === smAiActiveChatId);
  if (!active && smAiSessions.length) active = smAiSessions.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (!active) {
    active = { id: smAiMakeChatId(), title: 'New chat', items: [], updatedAt: Date.now() };
    smAiSessions.push(active);
  }
  smAiActiveChatId = active.id;
  smAiHistory = active.items;
  return smAiHistory;
}

function smAiWriteSessions() {
  try {
    const saved = smAiSessions.slice(-50).map(chat => ({
      id: chat.id,
      title: chat.title || smAiChatTitle(chat.items),
      items: (chat.items || []).slice(-160),
      updatedAt: chat.updatedAt || Date.now()
    }));
    localStorage.setItem(smAiHistoryKey, JSON.stringify({ sessions: saved, activeId: smAiActiveChatId }));
    localStorage.setItem(smAiActiveChatKey, smAiActiveChatId);
  } catch (error) {
    console.warn('[STAYMATE][AI HISTORY] Unable to save saved chats.', error);
  }
  smAiUpdateHistoryButton();
}

function smAiSaveHistory() {
  const active = smAiSessions.find(chat => chat.id === smAiActiveChatId);
  if (active) {
    active.items = smAiHistory.slice(-160);
    active.title = smAiChatTitle(active.items);
    active.updatedAt = Date.now();
  }
  smAiWriteSessions();
}

function smAiUpdateHistoryButton() {
  if (!smAiHistoryButton) return;
  smAiHistoryButton.hidden = !smAiSessions.some(chat => (chat.items || []).some(item => item?.type === 'message'));
}

function smAiAddMessage(text, sender = 'bot', persist = true) {
  if (!smAiMessages) return null;
  const safeText = String(text ?? '');
  const message = document.createElement('div');
  message.className = `sm-ai-message sm-ai-${sender}`;
  const bubble = document.createElement('div');
  bubble.className = 'sm-ai-bubble';
  bubble.textContent = safeText;
  message.appendChild(bubble);
  smAiMessages.appendChild(message);
  smAiMessages.scrollTop = smAiMessages.scrollHeight;
  if (persist) {
    smAiHistory.push({ type: 'message', sender, text: safeText, timestamp: Date.now() });
    smAiSaveHistory();
  }
  return message;
}

function smAiRenderHistoryItems(items) {
  if (!smAiMessages) return;
  smAiMessages.replaceChildren();
  (items || []).forEach(item => {
    if (!item || typeof item !== 'object') return;
    if (item.type === 'message') {
      smAiAddMessage(item.text || '', item.sender === 'user' ? 'user' : 'bot', false);
    } else if (item.type === 'hotel_results') {
      smAiRenderHotelResults(item.destination, item.hotels, item.searchContext, false);
    } else if (item.type === 'more_hotels') {
      smAiRenderMoreHotelsAction(item.destination, item.searchContext, false);
    }
  });
}

function smAiRenderPastChatActions() {
  if (!smAiMessages) return;
  // Remove any previous action row before adding the current one.
  smAiMessages.querySelectorAll('.sm-ai-past-chat-actions').forEach(node => node.remove());
  const actions = document.createElement('div');
  actions.className = 'sm-ai-past-chat-actions';
  actions.style.cssText = 'display:flex;gap:10px;padding:10px 0;position:sticky;bottom:0;background:var(--sm-ai-panel-bg,#fff);z-index:2;';

  const continueButton = document.createElement('button');
  continueButton.type = 'button';
  continueButton.textContent = 'Continue';
  continueButton.style.cssText = 'flex:1;padding:11px;border:0;border-radius:9px;background:#087fbd;color:#fff;font-weight:700;cursor:pointer;';
  continueButton.addEventListener('click', () => {
    const selected = smAiSessions.find(chat => chat.id === smAiSelectedPastChatId);
    if (!selected) return;
    smAiActiveChatId = selected.id;
    smAiHistory = selected.items;
    smAiWriteSessions();
    smAiRenderHistoryItems(smAiHistory);
    smAiOpen();
    if (smAiInput) smAiInput.focus();
  });

  const newButton = document.createElement('button');
  newButton.type = 'button';
  newButton.textContent = 'New Chat';
  newButton.style.cssText = 'flex:1;padding:11px;border:1px solid #087fbd;border-radius:9px;background:#fff;color:#087fbd;font-weight:700;cursor:pointer;';
  newButton.addEventListener('click', () => smAiStartNewChat());
  actions.append(continueButton, newButton);
  smAiMessages.appendChild(actions);
  smAiMessages.scrollTop = smAiMessages.scrollHeight;
}

function smAiShowPastChats() {
  if (!smAiMessages) return;
  const chats = smAiSessions
    .filter(chat => (chat.items || []).some(item => item?.type === 'message'))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (!chats.length) {
    smAiStartNewChat();
    return;
  }

  // Past Chats opens the latest saved conversation directly; do not show a second picker.
  const active = chats.find(chat => chat.id === smAiActiveChatId) || chats[0];
  smAiSelectedPastChatId = active.id;
  smAiRenderHistoryItems(active.items);
  smAiRenderPastChatActions();
  smAiOpen();
}

function smAiRestoreHistory(openPanel = false) {
  smAiReadHistory();
  if (!smAiMessages) return;
  smAiRenderHistoryItems(smAiHistory);
  if (openPanel) smAiOpen();
}

function smAiRenderDefaultAssistant() {
  if (!smAiMessages) return;
  smAiMessages.replaceChildren();

  const greeting = document.createElement('div');
  greeting.className = 'sm-ai-message sm-ai-bot';
  const bubble = document.createElement('div');
  bubble.className = 'sm-ai-bubble';
  bubble.innerHTML = "Hi! 👋 I'm the StayMate AI Assistant.<br><br>I can help you with StayMate's booking, account, payment and cancellation information.";
  greeting.appendChild(bubble);
  smAiMessages.appendChild(greeting);

  const faqSection = document.createElement('div');
  faqSection.className = 'sm-ai-faq-section';
  const title = document.createElement('span');
  title.className = 'sm-ai-faq-title';
  title.textContent = 'Frequently asked';
  faqSection.appendChild(title);
  const faqList = document.createElement('div');
  faqList.className = 'sm-ai-faqs';
  [
    ['Can I cancel my booking?', 'Can I cancel my booking?'],
    ['What happens if I forget my password?', 'What happens if I forget my password?'],
    ['How can I view my past bookings?', 'How can I view my past bookings?'],
    ['How do I create an account?', 'How do I create a StayMate account?']
  ].forEach(([label, question]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sm-ai-faq';
    button.dataset.question = question;
    button.textContent = label;
    faqList.appendChild(button);
  });
  faqSection.appendChild(faqList);
  smAiMessages.appendChild(faqSection);
}

function smAiStartNewChat() {
  const chat = { id: smAiMakeChatId(), title: 'New chat', items: [], updatedAt: Date.now() };
  smAiSessions.push(chat);
  smAiActiveChatId = chat.id;
  smAiHistory = chat.items;
  smAiSelectedPastChatId = '';
  smAiWriteSessions();
  smAiRenderDefaultAssistant();
  smAiOpen();
  if (smAiInput) smAiInput.focus();
}

if (smAiHistoryButton) {
  smAiHistoryButton.addEventListener('click', () => smAiShowPastChats());
}

// Load/migrate saved conversations on startup.
smAiReadHistory();

function smAiIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function smAiDefaultDates() {
  const checkIn = new Date();
  checkIn.setHours(0, 0, 0, 0);
  checkIn.setDate(checkIn.getDate() + 1);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);
  return { check_in: smAiIsoDate(checkIn), check_out: smAiIsoDate(checkOut) };
}

function smAiHotelAddress(hotel) {
  if (typeof hotel?.address === 'string') return hotel.address;
  if (hotel?.address && typeof hotel.address === 'object') {
    return hotel.address.formatted || hotel.address.full || hotel.address.display_name || '';
  }
  return hotel?.formatted_address || hotel?.display_address || hotel?.vicinity || '';
}

function smAiHotelImage(hotel) {
  if (typeof hotel?.thumbnail === 'string') return hotel.thumbnail;
  if (typeof hotel?.image === 'string') return hotel.image;
  if (Array.isArray(hotel?.images) && hotel.images.length) {
    const first = hotel.images[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') return first.thumbnail || first.original_image || '';
  }
  return '';
}

function smAiCompactHistoryHotel(hotel) {
  return {
    name: String(hotel?.name || hotel?.title || 'Hotel'),
    address: smAiHotelAddress(hotel),
    thumbnail: smAiHotelImage(hotel),
    property_token: hotel?.property_token || '',
    link: hotel?.link || hotel?.hotel_link || '',
    overall_rating: hotel?.overall_rating ?? hotel?.rating ?? null,
    reviews: hotel?.reviews ?? null,
    price_per_night: hotel?.price_per_night ?? hotel?.rate_per_night?.extracted_lowest ?? hotel?.extracted_price ?? null
  };
}

function smAiRenderMoreHotelsAction(destination, searchContext, persist = true) {
  if (!smAiMessages) return null;
  const wrapper = document.createElement('div');
  wrapper.className = 'sm-ai-message sm-ai-bot sm-ai-more-hotels';
  wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;gap:10px;';
  const note = document.createElement('div');
  note.className = 'sm-ai-bubble';
  note.textContent = `Would you like to explore more hotels in ${destination}? Open the StayMate AI website to see additional results.`;
  wrapper.appendChild(note);
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = `Find More Hotels in ${destination}`;
  button.style.cssText = 'width:100%;padding:11px 12px;border:0;border-radius:10px;background:#087fbd;color:#fff;font-weight:700;cursor:pointer;white-space:normal;';
  button.addEventListener('click', () => {
    try { localStorage.setItem('staymate_ai_restore_on_return', '1'); } catch (_) {}
    const params = new URLSearchParams({ assistant_search: destination });
    if (searchContext?.check_in) params.set('check_in', searchContext.check_in);
    if (searchContext?.check_out) params.set('check_out', searchContext.check_out);
    if (searchContext?.adults) params.set('adults', String(searchContext.adults));
    if (searchContext?.children !== undefined) params.set('children', String(searchContext.children));
    if (searchContext?.rooms) params.set('rooms', String(searchContext.rooms));
    window.location.href = `/?${params.toString()}`;
  });
  wrapper.appendChild(button);
  smAiMessages.appendChild(wrapper);
  smAiMessages.scrollTop = smAiMessages.scrollHeight;
  if (persist) {
    smAiHistory.push({ type: 'more_hotels', destination, searchContext, timestamp: Date.now() });
    smAiSaveHistory();
  }
  return wrapper;
}

function smAiOpenHotelPrices(hotel, destination, searchContext) {
  const params = new URLSearchParams();
  params.set('name', String(hotel?.name || hotel?.title || 'Hotel'));
  params.set('address', smAiHotelAddress(hotel));
  const price = hotel?.price_per_night ?? hotel?.rate_per_night?.extracted_lowest ?? hotel?.extracted_price ?? '';
  if (price !== '') params.set('price', String(price));
  params.set('location', String(searchContext?.location || destination));
  params.set('check_in', String(searchContext?.check_in || ''));
  params.set('check_out', String(searchContext?.check_out || ''));
  params.set('adults', String(searchContext?.adults || 2));
  params.set('children', String(searchContext?.children ?? 0));
  params.set('rooms', String(searchContext?.rooms || 1));
  if (hotel?.property_token) params.set('property_token', String(hotel.property_token));
  const link = hotel?.link || hotel?.hotel_link;
  if (link) params.set('link', String(link));
  params.set('assistant_flow', '1');
  try { localStorage.setItem('staymate_ai_restore_on_return', '1'); } catch (_) {}
  window.location.href = `/compare-prices?${params.toString()}`;
}

function smAiRenderHotelResults(destination, hotels, searchContext, persist = true) {
  if (!smAiMessages) return null;
  const list = Array.isArray(hotels) ? hotels.slice(0, 5) : [];
  const wrapper = document.createElement('div');
  wrapper.className = 'sm-ai-message sm-ai-bot sm-ai-hotel-results';
  wrapper.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr);gap:10px;width:100%;';
  list.forEach(hotel => {
    const card = document.createElement('article');
    card.className = 'sm-ai-hotel-card';
    card.style.cssText = 'overflow:hidden;border:1px solid #dce8ef;border-radius:12px;background:#fff;color:#17324d;box-shadow:0 4px 14px rgba(20,50,70,.06);';
    const imageUrl = smAiHotelImage(hotel);
    if (imageUrl) {
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = String(hotel?.name || 'Hotel');
      image.loading = 'lazy';
      image.style.cssText = 'display:block;width:100%;height:120px;object-fit:cover;';
      card.appendChild(image);
    }
    const body = document.createElement('div');
    body.style.cssText = 'padding:12px;display:grid;gap:7px;';
    const title = document.createElement('strong');
    title.textContent = String(hotel?.name || hotel?.title || 'Hotel');
    title.style.cssText = 'font-size:14px;line-height:1.35;';
    body.appendChild(title);
    const address = smAiHotelAddress(hotel);
    if (address) {
      const addressEl = document.createElement('div');
      addressEl.textContent = `📍 ${address}`;
      addressEl.style.cssText = 'font-size:12px;color:#60788c;';
      body.appendChild(addressEl);
    }
    const rating = hotel?.overall_rating ?? hotel?.rating;
    if (rating !== undefined && rating !== null && rating !== '') {
      const ratingEl = document.createElement('div');
      ratingEl.textContent = `⭐ ${rating}${hotel?.reviews ? ` · ${hotel.reviews} reviews` : ''}`;
      ratingEl.style.cssText = 'font-size:12px;color:#526b7d;';
      body.appendChild(ratingEl);
    }
    const rate = hotel?.price_per_night ?? hotel?.rate_per_night?.extracted_lowest ?? hotel?.extracted_price;
    const priceEl = document.createElement('div');
    if (rate !== undefined && rate !== null && rate !== '') {
      const amount = Number(rate);
      priceEl.textContent = `₹${Number.isFinite(amount) ? amount.toLocaleString('en-IN') : rate} / night`;
    } else {
      priceEl.textContent = 'Price available on comparison';
    }
    priceEl.style.cssText = 'font-size:14px;font-weight:750;color:#087fbd;';
    body.appendChild(priceEl);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'View Prices';
    button.style.cssText = 'width:100%;padding:10px;border:0;border-radius:9px;background:#087fbd;color:#fff;font-weight:700;cursor:pointer;';
    button.addEventListener('click', () => smAiOpenHotelPrices(hotel, destination, searchContext));
    body.appendChild(button);
    card.appendChild(body);
    wrapper.appendChild(card);
  });
  smAiMessages.appendChild(wrapper);
  smAiMessages.scrollTop = smAiMessages.scrollHeight;
  if (persist) {
    smAiHistory.push({ type: 'hotel_results', destination, hotels: list.map(smAiCompactHistoryHotel), searchContext, timestamp: Date.now() });
    smAiSaveHistory();
  }
  return wrapper;
}

async function smAiSearchHotels(destination, entities = {}) {
  const requestedDestination = String(destination || '').trim();
  if (!requestedDestination) {
    smAiAddMessage('Which city or location would you like to stay in?', 'bot');
    return;
  }
  const loading = smAiAddLoading();
  try {
    const locationResponse = await fetch(`/api/locations/search?q=${encodeURIComponent(requestedDestination)}`);
    const locationData = await locationResponse.json();
    if (!locationResponse.ok) throw new Error(locationData.error || 'Unable to resolve that location.');
    const locations = Array.isArray(locationData.locations) ? locationData.locations : [];
    const selected = locations[0] || {};
    const canonicalLocation = String(selected.canonical_location || selected.display_name || selected.label || selected.name || requestedDestination).trim();
    const defaults = smAiDefaultDates();
    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
    const checkIn = validDate(entities.check_in) ? entities.check_in : defaults.check_in;
    let checkOut = validDate(entities.check_out) ? entities.check_out : defaults.check_out;
    if (checkOut <= checkIn) {
      const next = new Date(`${checkIn}T00:00:00`);
      next.setDate(next.getDate() + 1);
      checkOut = smAiIsoDate(next);
    }
    const searchContext = {
      location: canonicalLocation,
      check_in: checkIn,
      check_out: checkOut,
      adults: Math.max(1, Number(entities.adults) || 2),
      children: Math.max(0, Number(entities.children) || 0),
      rooms: Math.max(1, Number(entities.rooms) || 1)
    };
    const query = new URLSearchParams(searchContext);
    const response = await fetch(`/api/hotels?${query.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to search hotels right now.');
    const hotels = Array.isArray(data.properties) ? data.properties : (Array.isArray(data.hotels) ? data.hotels : []);
    if (loading) loading.remove();
    if (!hotels.length) {
      smAiAddMessage(`I couldn't find hotel results for ${canonicalLocation}. You can try the full StayMate AI website for another search.`, 'bot');
      smAiRenderMoreHotelsAction(canonicalLocation, searchContext, true);
      return;
    }
    smAiAddMessage(`Here are the first ${Math.min(5, hotels.length)} hotels I found in ${canonicalLocation}:`, 'bot');
    smAiRenderHotelResults(canonicalLocation, hotels.slice(0, 5), searchContext, true);
    smAiRenderMoreHotelsAction(canonicalLocation, searchContext, true);
  } catch (error) {
    if (loading) loading.remove();
    console.error('[STAYMATE][AI HOTEL SEARCH]', error);
    smAiAddMessage(error.message || 'I could not search hotels right now. Please try again.', 'bot');
  }
}

(function initializeAssistantHistory() {
  smAiUpdateHistoryButton();
  try {
    if (localStorage.getItem('staymate_ai_restore_on_return') === '1') {
      smAiRestoreHistory(false);
      localStorage.removeItem('staymate_ai_restore_on_return');
    }
  } catch (_) {}
})();

// =========================================================
// LOADING MESSAGE
// =========================================================

function smAiAddLoading() {

  if (!smAiMessages) {
    return null;
  }

  const message =
    document.createElement('div');

  message.className =
    'sm-ai-message sm-ai-bot';

  const bubble =
    document.createElement('div');

  bubble.className =
    'sm-ai-bubble';

  bubble.innerHTML = `
    <span class="sm-ai-loading">
      <span></span>
      <span></span>
      <span></span>
    </span>
  `;

  message.appendChild(
    bubble
  );

  smAiMessages.appendChild(
    message
  );

  smAiMessages.scrollTop =
    smAiMessages.scrollHeight;

  return message;
}

// =========================================================
// VIEW MY BOOKINGS
// =========================================================
function smAiRenderBookingCards(
  bookings,
  title
) {
  if (!smAiMessages) {
    return;
  }

  // -------------------------------------------------------
  // BOOKING CARD STYLES
  // -------------------------------------------------------

  if (
    !document.getElementById(
      'sm-ai-booking-card-style'
    )
  ) {
    const style =
      document.createElement('style');

    style.id =
      'sm-ai-booking-card-style';

    style.textContent = `
      .sm-ai-bookings-wrapper {
        width: 100%;
        box-sizing: border-box;
      }

      .sm-ai-bookings-title {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .sm-ai-booking-card {
        width: 100%;
        box-sizing: border-box;
        padding: 14px;
        margin-bottom: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }

      .sm-ai-booking-hotel {
        font-size: 15px;
        font-weight: 700;
        line-height: 1.4;
        margin-bottom: 10px;
        color: #111827;
        overflow-wrap: anywhere;
      }

      .sm-ai-booking-row {
        display: flex;
        align-items: flex-start;
        gap: 7px;
        margin-top: 7px;
        font-size: 13px;
        line-height: 1.4;
        color: #374151;
      }

      .sm-ai-booking-icon {
        width: 18px;
        flex: 0 0 18px;
      }

      .sm-ai-booking-label {
        font-weight: 600;
        color: #6b7280;
      }

      .sm-ai-booking-value {
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .sm-ai-booking-status {
        font-weight: 600;
        text-transform: capitalize;
      }

      .sm-ai-booking-total {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #e5e7eb;
        font-size: 14px;
        font-weight: 700;
        color: #111827;
      }
    `;

    document.head.appendChild(style);
  }

  const message =
    document.createElement('div');

  message.className =
    'sm-ai-message sm-ai-bot';

  const bubble =
    document.createElement('div');

  bubble.className =
    'sm-ai-bubble';

  const wrapper =
    document.createElement('div');

  wrapper.className =
    'sm-ai-bookings-wrapper';

  const heading =
    document.createElement('div');

  heading.className =
    'sm-ai-bookings-title';

  heading.textContent =
    `${title} (${bookings.length})`;

  wrapper.appendChild(
    heading
  );

  bookings.forEach(
    (
      booking,
      index
    ) => {

      const card =
        document.createElement('div');

      card.className =
        'sm-ai-booking-card';

      const hotel =
        document.createElement('div');

      hotel.className =
        'sm-ai-booking-hotel';

      hotel.textContent =
        `${index + 1}. 🏨 ${
          booking.hotel_name || 'Hotel'
        }`;

      card.appendChild(
        hotel
      );

      const addRow =
        (
          icon,
          label,
          value
        ) => {

          const row =
            document.createElement('div');

          row.className =
            'sm-ai-booking-row';

          const iconElement =
            document.createElement('span');

          iconElement.className =
            'sm-ai-booking-icon';

          iconElement.textContent =
            icon;

          const content =
            document.createElement('div');

          content.className =
            'sm-ai-booking-value';

          const labelElement =
            document.createElement('span');

          labelElement.className =
            'sm-ai-booking-label';

          labelElement.textContent =
            `${label}: `;

          content.appendChild(
            labelElement
          );

          const valueElement =
            document.createElement('span');

          valueElement.textContent =
            value;

          content.appendChild(
            valueElement
          );

          row.appendChild(
            iconElement
          );

          row.appendChild(
            content
          );

          card.appendChild(
            row
          );
        };

      addRow(
        '📌',
        'Booking ID',
        booking.booking_reference || 'N/A'
      );

      addRow(
        '📅',
        'Dates',
        `${booking.check_in || 'N/A'} → ${
          booking.check_out || 'N/A'
        }`
      );

      addRow(
        '👥',
        'Guests',
        `${booking.num_persons || 0} adults · ${
          booking.num_children || 0
        } children`
      );

      addRow(
        '🛏️',
        'Rooms',
        `${booking.num_rooms || 1} ${
          Number(booking.num_rooms || 1) === 1
            ? 'room'
            : 'rooms'
        }`
      );

      const statusRow =
        document.createElement('div');

      statusRow.className =
        'sm-ai-booking-row';

      const statusIcon =
        document.createElement('span');

      statusIcon.className =
        'sm-ai-booking-icon';

      statusIcon.textContent =
        '💳';

      const statusContent =
        document.createElement('div');

      statusContent.className =
        'sm-ai-booking-status';

      statusContent.textContent =
        String(
          booking.booking_status || 'N/A'
        );

      statusRow.appendChild(
        statusIcon
      );

      statusRow.appendChild(
        statusContent
      );

      card.appendChild(
        statusRow
      );

      const total =
        document.createElement('div');

      total.className =
        'sm-ai-booking-total';

      total.textContent =
        `💰 Total: ${
          money(booking.total_amount)
        }`;

      card.appendChild(
        total
      );

      wrapper.appendChild(
        card
      );
    }
  );

  bubble.appendChild(
    wrapper
  );

  message.appendChild(
    bubble
  );

  smAiMessages.appendChild(
    message
  );

  smAiMessages.scrollTop =
    smAiMessages.scrollHeight;
}

async function smAiViewBookings(
  filter = 'all',
  paymentMethod = ''
) {

  try {

    const response =
      await fetch(
        '/api/my-bookings'
      );


    const data =
      await response.json();


    if (
      !response.ok
    ) {

      throw new Error(
        data.error ||
        'Unable to load your bookings.'
      );

    }


    const bookings =
      Array.isArray(
        data.bookings
      )
        ? data.bookings
        : [];


    if (
      !bookings.length
    ) {

      smAiAddMessage(
        'You do not have any bookings yet.',
        'bot'
      );

      return;
    }


    // -------------------------------------------------------
    // TODAY
    // -------------------------------------------------------

    const today =
      toISO(
        new Date()
      );


    // -------------------------------------------------------
    // FILTER
    // -------------------------------------------------------

    let filteredBookings =
      bookings;


    if (
      filter ===
      'cancelled'
    ) {

      filteredBookings =
        bookings.filter(
          booking =>
            String(
              booking.booking_status || ''
            )
              .trim()
              .toLowerCase() ===
            'cancelled'
        );

    } else if (
      filter ===
      'confirmed'
    ) {

      filteredBookings =
        bookings.filter(
          booking =>
            String(
              booking.booking_status || ''
            )
              .trim()
              .toLowerCase() ===
            'confirmed'
        );

    } else if (
      filter ===
      'upcoming'
    ) {

      filteredBookings =
        bookings.filter(
          booking => {

            const status =
              String(
                booking.booking_status || ''
              )
                .trim()
                .toLowerCase();

            const checkIn =
              String(
                booking.check_in || ''
              ).trim();


            return (
              status === 'confirmed' &&
              checkIn &&
              checkIn > today
            );

          }
        );
    }

    
    // -------------------------------------------------------
    // FILTER BY PAYMENT METHOD
    // -------------------------------------------------------

    const normalizedPaymentMethod =
      String(paymentMethod || '')
        .trim()
        .toLowerCase();

        console.log(
          '[STAYMATE][PAYMENT FILTER]',
          {
            receivedPaymentMethod: paymentMethod,
            normalizedPaymentMethod,
            bookingCount: bookings.length,
            paymentMethodsInBookings: bookings.map(
              booking => booking.payment_method
            )
          }
        );

    if (normalizedPaymentMethod) {
      filteredBookings =
        filteredBookings.filter(booking =>
          String(booking.payment_method || '')
            .trim()
            .toLowerCase() === normalizedPaymentMethod
        );
    }
    console.log(
      '[STAYMATE][PAYMENT FILTER RESULT]',
      {
        requestedPaymentMethod: normalizedPaymentMethod,
        filteredCount: filteredBookings.length,
        matchedPaymentMethods: filteredBookings.map(
          booking => booking.payment_method
        )
      }
    );

    
    // -------------------------------------------------------
    // NO MATCHING BOOKINGS
    // -------------------------------------------------------

    if (!filteredBookings.length) {

      let message = 'You do not have ';

      if (normalizedPaymentMethod) {
        smAiAddMessage(
          `You do not have any bookings paid with ${paymentMethod}.`,
          'bot'
        );

        return;
      }

      if (filter === 'cancelled') {
        message += 'any cancelled bookings.';
      } else if (filter === 'confirmed') {
        message += 'any confirmed bookings.';
      } else if (filter === 'upcoming') {
        message += 'any upcoming bookings.';
      } else {
        message += 'any bookings.';
      }

      smAiAddMessage(message, 'bot');

      return;
    }


    // -------------------------------------------------------
    // TITLE
    // -------------------------------------------------------

    let title =
      'Your bookings';


    if (
      filter ===
      'cancelled'
    ) {

      title =
        'Your cancelled bookings';

    } else if (
      filter ===
      'confirmed'
    ) {

      title =
        'Your confirmed bookings';

    } else if (
      filter ===
      'upcoming'
    ) {

      title =
        'Your upcoming bookings';
    }

    if (normalizedPaymentMethod) {
      title =
        `Your bookings paid with ${paymentMethod}`;
    }

    // -------------------------------------------------------
    // BOOKING CARD STYLE
    // -------------------------------------------------------

    if (
      !document.getElementById(
        'sm-ai-booking-card-style'
      )
    ) {

      const style =
        document.createElement(
          'style'
        );


      style.id =
        'sm-ai-booking-card-style';


      style.textContent = `
        .sm-ai-bookings-wrapper {
          width: 100%;
          box-sizing: border-box;
        }

        .sm-ai-bookings-title {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #111827;
        }

        .sm-ai-booking-card {
          width: 100%;
          box-sizing: border-box;
          padding: 14px;
          margin-bottom: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .sm-ai-booking-hotel {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.4;
          margin-bottom: 10px;
          color: #111827;
          overflow-wrap: anywhere;
        }

        .sm-ai-booking-row {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin-top: 7px;
          font-size: 13px;
          line-height: 1.4;
          color: #374151;
        }

        .sm-ai-booking-icon {
          width: 18px;
          min-width: 18px;
          flex: 0 0 18px;
        }

        .sm-ai-booking-label {
          font-weight: 600;
          color: #6b7280;
        }

        .sm-ai-booking-value {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .sm-ai-booking-status {
          font-size: 13px;
          font-weight: 600;
          text-transform: capitalize;
          color: #374151;
        }

        .sm-ai-booking-total {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          font-weight: 700;
          color: #111827;
        }
      `;


      document.head.appendChild(
        style
      );

    }


    // -------------------------------------------------------
    // CREATE AI MESSAGE
    // -------------------------------------------------------

    const message =
      document.createElement(
        'div'
      );


    message.className =
      'sm-ai-message sm-ai-bot';


    const bubble =
      document.createElement(
        'div'
      );


    bubble.className =
      'sm-ai-bubble';


    const wrapper =
      document.createElement(
        'div'
      );


    wrapper.className =
      'sm-ai-bookings-wrapper';


    // -------------------------------------------------------
    // TITLE
    // -------------------------------------------------------

    const heading =
      document.createElement(
        'div'
      );


    heading.className =
      'sm-ai-bookings-title';


    heading.textContent =
      `${title} (${filteredBookings.length})`;


    wrapper.appendChild(
      heading
    );


    // -------------------------------------------------------
    // CREATE BOOKING CARDS
    // -------------------------------------------------------

    filteredBookings.forEach(
      (
        booking,
        index
      ) => {

        const card =
          document.createElement(
            'div'
          );


        card.className =
          'sm-ai-booking-card';


        // ---------------------------------------------------
        // HOTEL NAME
        // ---------------------------------------------------

        const hotel =
          document.createElement(
            'div'
          );


        hotel.className =
          'sm-ai-booking-hotel';


        hotel.textContent =
          `${index + 1}. 🏨 ${
            booking.hotel_name ||
            'Hotel'
          }`;


        card.appendChild(
          hotel
        );


        // ---------------------------------------------------
        // HELPER FOR BOOKING ROW
        // ---------------------------------------------------

        const addRow =
          (
            icon,
            label,
            value
          ) => {

            const row =
              document.createElement(
                'div'
              );


            row.className =
              'sm-ai-booking-row';


            const iconElement =
              document.createElement(
                'span'
              );


            iconElement.className =
              'sm-ai-booking-icon';


            iconElement.textContent =
              icon;


            const content =
              document.createElement(
                'div'
              );


            content.className =
              'sm-ai-booking-value';


            const labelElement =
              document.createElement(
                'span'
              );


            labelElement.className =
              'sm-ai-booking-label';


            labelElement.textContent =
              `${label}: `;


            content.appendChild(
              labelElement
            );


            const valueElement =
              document.createElement(
                'span'
              );


            valueElement.textContent =
              value;


            content.appendChild(
              valueElement
            );


            row.appendChild(
              iconElement
            );


            row.appendChild(
              content
            );


            card.appendChild(
              row
            );

          };


        // ---------------------------------------------------
        // BOOKING ID
        // ---------------------------------------------------

        addRow(
          '📌',
          'Booking ID',
          booking.booking_reference ||
          'N/A'
        );


        // ---------------------------------------------------
        // DATES
        // ---------------------------------------------------

        addRow(
          '📅',
          'Dates',
          `${booking.check_in || 'N/A'} → ${
            booking.check_out || 'N/A'
          }`
        );


        // ---------------------------------------------------
        // GUESTS
        // ---------------------------------------------------

        addRow(
          '👥',
          'Guests',
          `${booking.num_persons || 0} adults · ${
            booking.num_children || 0
          } children`
        );


        // ---------------------------------------------------
        // ROOMS
        // ---------------------------------------------------

        const rooms =
          Number(
            booking.num_rooms || 1
          );


        addRow(
          '🛏️',
          'Rooms',
          `${rooms} ${
            rooms === 1
              ? 'room'
              : 'rooms'
          }`
        );

        

        // ---------------------------------------------------
        // STATUS
        // ---------------------------------------------------

        const statusRow =
          document.createElement(
            'div'
          );


        statusRow.className =
          'sm-ai-booking-row';


        const statusIcon =
          document.createElement(
            'span'
          );


        statusIcon.className =
          'sm-ai-booking-icon';


        statusIcon.textContent =
          '💳';


        const statusContent =
          document.createElement(
            'div'
          );


        statusContent.className =
          'sm-ai-booking-status';


        statusContent.textContent =
          String(
            booking.booking_status ||
            'N/A'
          );


        statusRow.appendChild(
          statusIcon
        );


        statusRow.appendChild(
          statusContent
        );


        card.appendChild(
          statusRow
        );


        // ---------------------------------------------------
        // TOTAL
        // ---------------------------------------------------

        const total =
          document.createElement(
            'div'
          );


        total.className =
          'sm-ai-booking-total';


        total.textContent =
          `💰 Total: ${
            money(
              booking.total_amount
            )
          }`;


        card.appendChild(
          total
        );


        // ---------------------------------------------------
        // ADD CARD TO WRAPPER
        // ---------------------------------------------------

        wrapper.appendChild(
          card
        );

      }
    );


    // -------------------------------------------------------
    // ADD TO AI CHAT
    // -------------------------------------------------------

    bubble.appendChild(
      wrapper
    );


    message.appendChild(
      bubble
    );


    smAiMessages.appendChild(
      message
    );


    smAiMessages.scrollTop =
      smAiMessages.scrollHeight;


  } catch (
    error
  ) {

    console.error(
      '[STAYMATE][AI ASSISTANT] View bookings failed',
      error
    );


    smAiAddMessage(
      error.message ||
      'Unable to load your bookings right now.',
      'bot'
    );

  }
}

// =========================================================
// PREPARE BOOKING CANCELLATION
// =========================================================

async function smAiPrepareCancellation() {

  try {

    const response =
      await fetch(
        '/api/my-bookings'
      );

    const data =
      await response.json();

    if (
      !response.ok
    ) {

      throw new Error(
        data.error ||
        'Unable to load your bookings.'
      );

    }

    const bookings =
      Array.isArray(
        data.bookings
      )
        ? data.bookings
        : [];

    const today =
      toISO(
        new Date()
      );

    const cancellableBookings =
      bookings.filter(
        booking => {

          const status =
            String(
              booking.booking_status || ''
            )
              .trim()
              .toLowerCase();

          const checkIn =
            String(
              booking.check_in || ''
            )
              .trim();

          return (
            status === 'confirmed' &&
            checkIn &&
            checkIn > today
          );

        }
      );

    if (
      !cancellableBookings.length
    ) {

      smAiCancellationBookings = [];

      smAiCancellationSelectionRequired =
        false;

      smAiPendingCancellation =
        null;

      smAiAddMessage(
        'I could not find any confirmed bookings that can currently be cancelled.',
        'bot'
      );

      return;
    }

    /*
     * Store the bookings currently shown
     * to the user.
     */
    smAiCancellationBookings =
      cancellableBookings;

    /*
     * ONE BOOKING
     *
     * No ambiguity.
     */
    if (
      cancellableBookings.length === 1
    ) {

      const booking =
        cancellableBookings[0];

      smAiCancellationSelectionRequired =
        false;

      smAiPendingCancellation =
        booking;

      smAiAddMessage(
        `I found your booking:\n\n` +

        `Hotel: ` +
        `${booking.hotel_name || 'Hotel'}\n` +

        `Booking Reference: ` +
        `${booking.booking_reference || 'N/A'}\n` +

        `Check-in: ` +
        `${booking.check_in || 'N/A'}\n` +

        `Check-out: ` +
        `${booking.check_out || 'N/A'}\n` +

        `Total: ` +
        `${money(booking.total_amount)}\n\n` +

        `Would you like me to cancel this booking? ` +
        `Please reply "Yes" to confirm.`,

        'bot'
      );

      return;
    }

    /*
     * MULTIPLE BOOKINGS
     *
     * Do NOT select automatically.
     */
    smAiPendingCancellation =
      null;

    smAiCancellationSelectionRequired =
      true;

    let message =
      'I found multiple bookings that can be cancelled:\n\n';

    cancellableBookings.forEach(
      (
        booking,
        index
      ) => {

        message +=
          `${index + 1}. ` +
          `${booking.hotel_name || 'Hotel'}\n` +

          `Booking Reference: ` +
          `${booking.booking_reference || 'N/A'}\n` +

          `Check-in: ` +
          `${booking.check_in || 'N/A'}\n` +

          `Check-out: ` +
          `${booking.check_out || 'N/A'}\n\n`;

      }
    );

    message +=
      'Please reply with the booking number, ' +
      'hotel name, or booking reference.';

    smAiAddMessage(
      message,
      'bot'
    );

  }
  catch (error) {

    console.error(
      'Cancellation preparation error:',
      error
    );

    smAiCancellationBookings =
      [];

    smAiCancellationSelectionRequired =
      false;

    smAiPendingCancellation =
      null;

    smAiAddMessage(
      error.message ||
      'Unable to load your bookings.',
      'bot'
    );

  }
}

// =========================================================
// CANCEL BOOKING
// =========================================================

async function smAiCancelBooking(
  bookingReference
) {

  try {

    const response =
      await fetch(
        `/api/bookings/${encodeURIComponent(
          bookingReference
        )}/cancel`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          }
        }
      );


    const data =
      await response.json();


    if (
      !response.ok
    ) {

      throw new Error(
        data.error ||
        'Unable to cancel the booking.'
      );

    }


    smAiAddMessage(
      data.message ||
      'Your booking has been cancelled successfully.',
      'bot'
    );


  } catch (
    error
  ) {

    console.error(
      '[STAYMATE][AI ASSISTANT] Cancellation failed',
      error
    );


    smAiAddMessage(
      error.message ||
      'Unable to cancel the booking.',
      'bot'
    );

  }
}

// =========================================================
// AI ASSISTANT ACTION DETECTION
// =========================================================

function smAiDetectAction(
  text
) {

  const message =
    String(
      text || ''
    )
      .trim()
      .toLowerCase();


  // -------------------------------------------------------
  // CANCELLED BOOKINGS
  // -------------------------------------------------------

  const cancelledPatterns = [

    'show cancelled bookings',

    'show canceled bookings',

    'view cancelled bookings',

    'view canceled bookings',

    'see cancelled bookings',

    'see canceled bookings',

    'list cancelled bookings',

    'list canceled bookings',

    'my cancelled bookings',

    'my canceled bookings',

    'cancelled bookings',

    'canceled bookings'

  ];


  if (
    cancelledPatterns.some(
      pattern =>
        message.includes(
          pattern
        )
    )
  ) {

    return 'view_cancelled_bookings';

  }


  // -------------------------------------------------------
  // CONFIRMED BOOKINGS
  // -------------------------------------------------------

  const confirmedPatterns = [

    'show confirmed bookings',

    'view confirmed bookings',

    'see confirmed bookings',

    'list confirmed bookings',

    'my confirmed bookings',

    'confirmed bookings'

  ];


  if (
    confirmedPatterns.some(
      pattern =>
        message.includes(
          pattern
        )
    )
  ) {

    return 'view_confirmed_bookings';

  }


  // -------------------------------------------------------
  // UPCOMING BOOKINGS
  // -------------------------------------------------------

  const upcomingPatterns = [

    'show upcoming bookings',

    'view upcoming bookings',

    'see upcoming bookings',

    'list upcoming bookings',

    'my upcoming bookings',

    'upcoming bookings',

    'do i have any upcoming bookings'

  ];


  if (
    upcomingPatterns.some(
      pattern =>
        message.includes(
          pattern
        )
    )
  ) {

    return 'view_upcoming_bookings';

  }


  // -------------------------------------------------------
  // CANCEL BOOKING
  // -------------------------------------------------------

  const cancelPatterns = [

    'cancel my booking',

    'cancel booking',

    'cancel my reservation',

    'cancel reservation',

    'i want to cancel my booking',

    'i want to cancel my reservation'

  ];


  if (
    cancelPatterns.some(
      pattern =>
        message.includes(
          pattern
        )
    )
  ) {

    return 'cancel_booking';

  }


  // -------------------------------------------------------
  // VIEW ALL BOOKINGS
  // -------------------------------------------------------

  const viewBookingPatterns = [

    'show my bookings',

    'view my bookings',

    'see my bookings',

    'my bookings',

    'show bookings',

    'view bookings',

    'my reservations',

    'show my reservations',

    'view my reservations',

    'what bookings do i have',

    'what reservations do i have',

    'list my bookings'

  ];


  if (
    viewBookingPatterns.some(
      pattern =>
        message.includes(
          pattern
        )
    )
  ) {

    return 'view_bookings';

  }


  return 'rag';
}

// =========================================================
// HANDLE CANCELLATION CONFIRMATION
// =========================================================


 // =========================================================
 // HANDLE CANCELLATION CONFIRMATION
 // =========================================================

async function smAiHandleCancellationConfirmation(text) {
  const message = String(text || '')
    .trim()
    .toLowerCase();

  // -------------------------------------------------------
  // HANDLE NEGATIVE CONFIRMATION
  // -------------------------------------------------------

  const noWords = [
    'no',
    'no thanks',
    'no thank you',
    'cancel request',
    'keep it',
    'keep my booking',
    'do not cancel',
    "don't cancel",
    'never mind',
    'nevermind',
    'stop'
  ];

  if (noWords.includes(message)) {
    // Only handle this as a cancellation refusal when a
    // cancellation is actually pending.
    if (
      smAiPendingCancellation ||
      smAiCancellationSelectionRequired
    ) {
      smAiPendingCancellation = null;
      smAiCancellationSelectionRequired = false;
      smAiCancellationBookings = [];

      smAiAddMessage(
        'No problem. Your booking has not been cancelled.',
        'bot'
      );

      return true;
    }

    return false;
  }

  // -------------------------------------------------------
  // HANDLE POSITIVE CONFIRMATION
  // -------------------------------------------------------

  const yesWords = [
    'yes',
    'yes please',
    'confirm',
    'confirm cancellation',
    'cancel it',
    'do it'
  ];

  if (!yesWords.includes(message)) {
    return false;
  }

  if (!smAiPendingCancellation) {
    return false;
  }

  const booking = smAiPendingCancellation;

  // Clear pending state before processing the cancellation.
  smAiPendingCancellation = null;
  smAiCancellationSelectionRequired = false;

  await smAiCancelBooking(
    booking.booking_reference
  );

  return true;
}

// =========================================================
// HANDLE BOOKING REFERENCE SELECTION
// =========================================================

async function smAiHandleBookingReference(
  text
) {

  const bookings =
    smAiCancellationBookings;

  if (
    !Array.isArray(
      bookings
    ) ||
    !bookings.length
  ) {

    return false;
  }

  const message =
    String(
      text || ''
    )
      .trim()
      .toLowerCase();

  /*
   * -------------------------------------------------------
   * BOOKING NUMBER
   * Example: 1 / 2 / 3
   * -------------------------------------------------------
   */

  const numberMatch =
    message.match(
      /^\d+$/
    );

  if (
    numberMatch
  ) {

    const selectedNumber =
      Number(
        numberMatch[0]
      );

    if (
      selectedNumber >= 1 &&
      selectedNumber <= bookings.length
    ) {

      const booking =
        bookings[
          selectedNumber - 1
        ];

      smAiCancellationBookings =
        [];

      smAiCancellationSelectionRequired =
        false;

      smAiPendingCancellation =
        booking;

      smAiAddMessage(
        `You selected:\n\n` +

        `Hotel: ` +
        `${booking.hotel_name || 'Hotel'}\n` +

        `Booking Reference: ` +
        `${booking.booking_reference || 'N/A'}\n` +

        `Check-in: ` +
        `${booking.check_in || 'N/A'}\n` +

        `Check-out: ` +
        `${booking.check_out || 'N/A'}\n` +

        `Total: ` +
        `${money(booking.total_amount)}\n\n` +

        `Would you like me to cancel this booking? ` +
        `Please reply "Yes" to confirm.`,

        'bot'
      );

      return true;
    }

  }

  /*
   * -------------------------------------------------------
   * BOOKING REFERENCE
   * Example: SM-62DFA6769B
   * -------------------------------------------------------
   */

  const reference =
    message
      .toUpperCase();

  const referenceBooking =
    bookings.find(
      booking =>
        String(
          booking.booking_reference || ''
        )
          .trim()
          .toUpperCase() ===
        reference
    );

  if (
    referenceBooking
  ) {

    smAiCancellationBookings =
      [];

    smAiCancellationSelectionRequired =
      false;

    smAiPendingCancellation =
      referenceBooking;

    smAiAddMessage(
      `You selected:\n\n` +

      `Hotel: ` +
      `${referenceBooking.hotel_name || 'Hotel'}\n` +

      `Booking Reference: ` +
      `${referenceBooking.booking_reference || 'N/A'}\n` +

      `Check-in: ` +
      `${referenceBooking.check_in || 'N/A'}\n` +

      `Check-out: ` +
      `${referenceBooking.check_out || 'N/A'}\n` +

      `Total: ` +
      `${money(referenceBooking.total_amount)}\n\n` +

      `Would you like me to cancel this booking? ` +
      `Please reply "Yes" to confirm.`,

      'bot'
    );

    return true;
  }

  /*
  * -------------------------------------------------------
  * HOTEL NAME / PARTIAL HOTEL NAME
  * -------------------------------------------------------
  *
  * Matching priority:
  *
  * 1. Exact hotel name
  * 2. Consecutive hotel-name phrase
  * 3. Multiple meaningful words
  * 4. Single meaningful word as fallback
  *
  * This prevents common words such as "blue"
  * from incorrectly matching unrelated hotels.
  * -------------------------------------------------------
  */

 const ignoredWords = new Set([
   'cancel',
   'cancellation',
   'booking',
   'bookings',
   'book',
   'reservation',
   'reservations',
   'hotel',
   'hotels',
   'my',
   'the',
   'a',
   'an',
   'with',
   'at',
   'for',
   'of',
   'to',
   'please',
   'i',
   'want',
   'need',
   'would',
   'like',
   'me',
   'can',
   'you',
   'could',
   'this',
   'that',
   'it'
 ]);

 const cleanWords =
   value =>
     String(
       value || ''
     )
       .toLowerCase()
       .replace(
         /[^a-z0-9\s]/g,
         ' '
       )
       .split(
         /\s+/
       )
       .filter(
         Boolean
       );

 const messageWords =
   cleanWords(
     message
   ).filter(
     word =>
       !ignoredWords.has(
         word
       )
   );

 const messageText =
   messageWords.join(
     ' '
   );

 const hotelMatches =
   bookings.map(
     booking => {

       const hotelName =
         String(
           booking.hotel_name || ''
         )
           .trim()
           .toLowerCase();

       const hotelWords =
         cleanWords(
           hotelName
         );

       /*
        * Words from the hotel name that are
        * meaningful enough to identify it.
        */
       const meaningfulHotelWords =
         hotelWords.filter(
           word =>
             !ignoredWords.has(
               word
             )
         );

       /*
        * ---------------------------------------------------
        * EXACT HOTEL NAME
        * ---------------------------------------------------
        */

       const exactMatch =
         messageText ===
         meaningfulHotelWords.join(
           ' '
         );

       /*
        * ---------------------------------------------------
        * CONSECUTIVE PHRASE MATCH
        *
        * Example:
        *
        * User:
        * "cancel Blue Pearl"
        *
        * Hotel:
        * "Blue Pearl Beach Guest Hous"
        *
        * "Blue Pearl" is found as a consecutive phrase.
        * ---------------------------------------------------
        */

       let phraseMatch =
         false;

       if (
         meaningfulHotelWords.length >= 2 &&
         messageWords.length >= 2
       ) {

         for (
           let i = 0;
           i <=
           meaningfulHotelWords.length - 2;
           i++
         ) {

           const firstWord =
             meaningfulHotelWords[
               i
             ];

           const secondWord =
             meaningfulHotelWords[
               i + 1
             ];

           for (
             let j = 0;
             j <=
             messageWords.length - 2;
             j++
           ) {

             if (
               messageWords[j] ===
               firstWord &&
               messageWords[j + 1] ===
               secondWord
             ) {

               phraseMatch =
                 true;

               break;
             }

           }

           if (
             phraseMatch
           ) {
             break;
           }

         }

       }

       /*
        * ---------------------------------------------------
        * MULTIPLE WORD MATCH
        * ---------------------------------------------------
        */

       const matchedWordCount =
         meaningfulHotelWords.filter(
           word =>
             messageWords.includes(
               word
             )
         ).length;

       /*
        * ---------------------------------------------------
        * SINGLE WORD FALLBACK
        * ---------------------------------------------------
        *
        * Only allow a single word when it is reasonably
        * distinctive. Very common words are ignored.
        * ---------------------------------------------------
        */

       const singleWordMatch =
         meaningfulHotelWords.some(
           word =>
             word.length >= 5 &&
             messageWords.includes(
               word
             )
         );

       let score = 0;

       if (
         exactMatch
       ) {

         score = 100;

       }
       else if (
         phraseMatch
       ) {

         score = 80;

       }
       else if (
         matchedWordCount >= 2
       ) {

         score = 60 +
           matchedWordCount;

       }
       else if (
         singleWordMatch
       ) {

         score = 20;

       }

       return {
         booking,
         score,
         matchedWordCount
       };

     }
   )
   .filter(
     result =>
       result.score > 0
   )
   .sort(
     (
       first,
       second
     ) =>
       second.score -
       first.score
   );

 /*
  * Keep only bookings that have the same
  * best matching score.
  *
  * This is important when two bookings have
  * the same hotel name.
  */

 const matchingBookings =
   hotelMatches.length
     ? hotelMatches
         .filter(
           result =>
             result.score ===
             hotelMatches[0].score
         )
         .map(
           result =>
             result.booking
         )
     : [];

  /*
   * MULTIPLE BOOKINGS MATCH
   */

  if (
    matchingBookings.length > 1
  ) {

    smAiAddMessage(
      'I found multiple bookings for that hotel. ' +
      'Please specify the booking number or booking reference.',

      'bot'
    );

    return true;
  }

  return false;
}
// =========================================================
// ASK RAG
// =========================================================

// =========================================================
// LLM-BASED ASSISTANT ROUTING
// =========================================================

async function smAiClassifyMessage(message) {
  const response = await fetch('/api/assistant/classify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: String(message || '').trim()
    })
  });

  const raw = await response.text();

  console.log('[STAYMATE][CLASSIFY] HTTP status:', response.status);
  console.log('[STAYMATE][CLASSIFY] Raw response:', raw);

  let data;

  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Classifier returned non-JSON data (HTTP ${response.status}). Check the console and Flask terminal.`
    );
  }

  console.log('[STAYMATE][CLASSIFY] Parsed response:', data);

  if (!response.ok) {
    throw new Error(
      data.error || `Classifier request failed (HTTP ${response.status}).`
    );
  }

  // Support the current API's expected result structure and
  // expose unexpected response shapes for diagnosis.
  const result = data.result || data.classification || data;

  if (
    !response.ok ||
    data.success === false ||
    !result ||
    !result.intent ||
    !result.route
  ) {
    throw new Error(
      data.error ||
      data.message ||
      'Invalid classifier response.'
    );
  }

  return result;
}


// =========================================================
// ASK STAYMATE AI ASSISTANT
// =========================================================

async function smAiAsk(
  question
) {

  const query =
    String(
      question || ''
    ).trim();


  if (
    !query
  ) {

    return;
  }


  // -------------------------------------------------------
  // SHOW USER MESSAGE
  // -------------------------------------------------------

  smAiAddMessage(
    query,
    'user'
  );


  // -------------------------------------------------------
  // CLEAR INPUT
  // -------------------------------------------------------

  if (
    smAiInput
  ) {

    smAiInput.value =
      '';
  }


  // -------------------------------------------------------
  // CHECK CANCELLATION CONFIRMATION
  // -------------------------------------------------------

  const confirmationHandled =
    await smAiHandleCancellationConfirmation(
      query
    );


  if (
    confirmationHandled
  ) {

    return;
  }

  // -------------------------------------------------------
  // CANCEL "THAT"
  // -------------------------------------------------------
  
  const cancelThatPatterns = [
    'cancel that',
    'cancel this',
    'cancel it',
    'i need to cancel that',
    'i want to cancel that',
    'i need to cancel this',
    'i want to cancel this',
    'i need to cancel it',
    'i want to cancel it'
  ];
  
  const wantsToCancelPrevious =
    cancelThatPatterns.some(
      pattern =>
        query
          .toLowerCase()
          .includes(pattern)
    );
  
  if (
    wantsToCancelPrevious
  ) {
  
    /*
     * If exactly one booking was previously
     * selected, use it.
     */
    if (
      smAiPendingCancellation
    ) {
  
      smAiAddMessage(
        `I found the booking you referred to:\n\n` +
  
        `Hotel: ` +
        `${smAiPendingCancellation.hotel_name || 'Hotel'}\n` +
  
        `Booking Reference: ` +
        `${smAiPendingCancellation.booking_reference || 'N/A'}\n` +
  
        `Check-in: ` +
        `${smAiPendingCancellation.check_in || 'N/A'}\n` +
  
        `Check-out: ` +
        `${smAiPendingCancellation.check_out || 'N/A'}\n\n` +
  
        `Would you like me to cancel this booking? ` +
        `Please reply "Yes" to confirm.`,
  
        'bot'
      );
  
      return;
    }
  
    /*
     * If multiple bookings were displayed,
     * never guess.
     */
    if (
      smAiCancellationBookings.length > 1
    ) {
  
      smAiAddMessage(
        'I found multiple bookings in the previous results, ' +
        'so I am not sure which booking you want to cancel.\n\n' +
  
        'Please reply with the booking number or booking reference.',
  
        'bot'
      );
  
      return;
    }
  
    /*
     * No useful context.
     */
    await smAiPrepareCancellation();
  
    return;
  }

  // -------------------------------------------------------
  // CHECK BOOKING REFERENCE
  // -------------------------------------------------------

  const referenceHandled =
    await smAiHandleBookingReference(
      query
    );


  if (
    referenceHandled
  ) {

    return;
  }


  // -------------------------------------------------------
  // LLM-BASED ROUTING
  // -------------------------------------------------------

  const loading = smAiAddLoading();

  try {
    const classification = await smAiClassifyMessage(query);

    if (loading) {
      loading.remove();
    }

    
    // Read the classifier response.
    let intent = String(
      classification.intent || 'unknown'
    );

    let route = String(
      classification.route || 'rag'
    );

    let entities = {
      ...(classification.entities || {})
    };

    // Recover the destination when the user explicitly
    // requests a hotel search but the LLM omits it.
    const isHotelSearchRequest =
      /\b(find|search|show|get|look for|recommend)\b/i.test(query) &&
      /\bhotels?\b/i.test(query);

    const destinationMatch = query.match(
      /\b(?:in|at|near|around)\s+(.+?)\s*[.!?]*$/i
    );

    if (isHotelSearchRequest && destinationMatch) {
      const explicitDestination = destinationMatch[1]
        .replace(
          /\s+(?:for\s+\d+\s+(?:adults?|guests?|people|rooms?)|check[- ]?in|check[- ]?out|tomorrow|tonight|today)\b.*$/i,
          ''
        )
        .trim()
        .replace(/[,.!?]+$/, '')
        .trim();

      if (explicitDestination) {
        intent = 'hotel_search';
        route = 'hotel_search';

        entities = {
          ...entities,
          destination: explicitDestination
        };

        console.log(
          '[STAYMATE][HOTEL SEARCH] Using explicit destination:',
          explicitDestination
        );
      }
    }


    // Ask for clarification if the LLM needs more information.
    if (
      route === 'clarification' ||
      intent === 'clarification_needed'
    ) {
      smAiAddMessage(
        classification.clarification_question ||
        'Could you provide more details so I can help?',
        'bot'
      );

      return;
    }

    // -----------------------------------------------------
    // BOOKING ACTIONS
    // -----------------------------------------------------

    if (
      intent === 'view_bookings'
    ) {
      await smAiViewBookings(
        'all',
        entities.payment_method ||
        entities.paymentMethod ||
        ''
      );
    
      return;
    }

    if (intent === 'view_upcoming_bookings') {
      await smAiViewBookings('upcoming');
      return;
    }

    if (intent === 'view_confirmed_bookings') {
      await smAiViewBookings('confirmed');
      return;
    }

    if (intent === 'view_cancelled_bookings') {
      await smAiViewBookings('cancelled');
      return;
    }

    if (intent === 'cancel_booking') {
      await smAiPrepareCancellation();
      return;
    }

    // -----------------------------------------------------
    // HOTEL SEARCH
    // -----------------------------------------------------

    if (
      route === 'hotel_search' ||
      intent === 'hotel_search'
    ) {
      const destination = String(
        entities.destination ||
        entities.location ||
        ''
      ).trim();

      if (!destination) {
        smAiAddMessage(
          classification.clarification_question ||
          'Which city or location would you like to stay in?',
          'bot'
        );

        return;
      }

      await smAiSearchHotels(destination, entities);
      return;
    }

    // -----------------------------------------------------
    // RAG: POLICIES AND GENERAL QUESTIONS
    // -----------------------------------------------------

    const response = await fetch('/api/rag/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || 'Unable to get an answer.'
      );
    }

    smAiAddMessage(
      data.answer || 'I could not find an answer.',
      'bot'
    );

  } catch (error) {
    if (loading) {
      loading.remove();
    }

    console.error('[STAYMATE][AI ROUTER]', error);

    // Fallback to RAG if classification fails.
    try {
      const response = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || 'Unable to get an answer.'
        );
      }

      smAiAddMessage(
        data.answer || 'I could not find an answer.',
        'bot'
      );

    } catch (fallbackError) {
      console.error('[STAYMATE][RAG]', fallbackError);

      smAiAddMessage(
        'Sorry, I could not process that message right now. Please try again.',
        'bot'
      );
    }
  }
}
// =========================================================
// FAQ BUTTONS (delegated so they also work on the New Chat welcome screen)
// =========================================================

if (smAiMessages) {
  smAiMessages.addEventListener('click', event => {
    const faq = event.target.closest('.sm-ai-faq');
    if (!faq) return;
    const question = faq.dataset.question;
    if (question) smAiAsk(question);
  });
}


// =========================================================
// FORM SUBMIT
// =========================================================

if (smAiForm) {

  smAiForm.addEventListener(
    'submit',
    event => {

      event.preventDefault();

      const question =
        smAiInput
          ? smAiInput.value.trim()
          : '';

      if (!question) {
        return;
      }

      smAiAsk(
        question
      );

    }
  );

}


// =========================================================
// ESCAPE KEY
// =========================================================

document.addEventListener(
  'keydown',
  event => {

    if (
      event.key === 'Escape' &&
      smAiPanel &&
      smAiPanel.classList.contains('open')
    ) {

      smAiClosePanel();

    }

  }
);

// =========================================================
// END OF APP.JS
// ========================================================= 