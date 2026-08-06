const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutine = document.getElementById("generateRoutine");
const clearProducts = document.getElementById("clearProducts");
const rtlToggle = document.getElementById("rtlToggle");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Put the class Worker URL from your README here
const workerUrl = "https://wanderbot.sultan-bakare.workers.dev/";

let allProducts = [];

let selectedProducts =
  JSON.parse(localStorage.getItem("selectedProducts")) || [];

let messages = [
  {
    role: "system",
    content: `You are a helpful L'Oréal skincare and beauty advisor.
Help users create routines using the L'Oréal products they select.
You can answer questions about skincare, haircare, makeup, fragrance,
beauty routines, and the user's generated routine.
Keep your answers clear and easy to understand.
Politely refuse questions unrelated to beauty, L'Oréal products,
or the user's routine.`
  }
];

productsContainer.innerHTML = `
  <div class="placeholder-message">
    Browse or search for products to get started.
  </div>
`;

displaySelectedProducts();


// Load products once
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();

  allProducts = data.products;
}


// Display product cards
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found.
      </div>
    `;

    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some(
        (item) => item.name === product.name
      );

      return `
        <div
          class="product-card ${isSelected ? "selected" : ""}"
          data-name="${product.name}"
        >

          <img src="${product.image}" alt="${product.name}">

          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>

            <button class="details-btn">
              View Details
            </button>

            <p class="product-description hidden">
              ${product.description}
            </p>
          </div>

        </div>
      `;
    })
    .join("");


  const productCards =
    document.querySelectorAll(".product-card");

  productCards.forEach((card) => {
    card.addEventListener("click", () => {
      const productName = card.dataset.name;

      const product = allProducts.find(
        (item) => item.name === productName
      );

      toggleProduct(product);
      filterProducts();
    });
  });


  const detailButtons =
    document.querySelectorAll(".details-btn");

  detailButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();

      const description =
        button.nextElementSibling;

      description.classList.toggle("hidden");

      if (description.classList.contains("hidden")) {
        button.textContent = "View Details";
      } else {
        button.textContent = "Hide Details";
      }
    });
  });
}


// Add or remove product
function toggleProduct(product) {
  const alreadySelected = selectedProducts.some(
    (item) => item.name === product.name
  );

  if (alreadySelected) {
    selectedProducts = selectedProducts.filter(
      (item) => item.name !== product.name
    );
  } else {
    selectedProducts.push(product);
  }

  saveSelectedProducts();
  displaySelectedProducts();
}


// Display selected products
function displaySelectedProducts() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p>No products selected yet.</p>
    `;

    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product">

          <span>${product.name}</span>

          <button
            class="remove-product"
            data-name="${product.name}"
          >
            Remove
          </button>

        </div>
      `
    )
    .join("");


  const removeButtons =
    document.querySelectorAll(".remove-product");

  removeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const productName = button.dataset.name;

      selectedProducts = selectedProducts.filter(
        (product) => product.name !== productName
      );

      saveSelectedProducts();
      displaySelectedProducts();

      if (allProducts.length > 0) {
        filterProducts();
      }
    });
  });
}


// Save products after selection
function saveSelectedProducts() {
  localStorage.setItem(
    "selectedProducts",
    JSON.stringify(selectedProducts)
  );
}


// LEVELUP: Product Search
function filterProducts() {
  const searchText =
    productSearch.value.toLowerCase().trim();

  const selectedCategory =
    categoryFilter.value;

  const filteredProducts = allProducts.filter(
    (product) => {

      const matchesSearch =
        product.name.toLowerCase().includes(searchText) ||
        product.brand.toLowerCase().includes(searchText) ||
        product.description.toLowerCase().includes(searchText);

      const matchesCategory =
        selectedCategory === "" ||
        product.category === selectedCategory;

      return matchesSearch && matchesCategory;
    }
  );

  displayProducts(filteredProducts);
}


// Search as the user types
productSearch.addEventListener(
  "input",
  filterProducts
);


// Category and search work together
categoryFilter.addEventListener(
  "change",
  filterProducts
);


// Clear selections
clearProducts.addEventListener(
  "click",
  () => {

    selectedProducts = [];

    saveSelectedProducts();
    displaySelectedProducts();

    if (allProducts.length > 0) {
      filterProducts();
    }
  }
);


// LEVELUP: RTL Language Support
rtlToggle.addEventListener(
  "click",
  () => {

    if (document.body.dir === "rtl") {
      document.body.dir = "ltr";
      rtlToggle.textContent = "RTL";
    } else {
      document.body.dir = "rtl";
      rtlToggle.textContent = "LTR";
    }
  }
);


// Generate routine
generateRoutine.addEventListener(
  "click",
  async () => {

    if (selectedProducts.length === 0) {
      addMessage(
        "ai",
        "Please select at least one product before generating a routine."
      );

      return;
    }

    chatWindow.innerHTML = "";

    const productData =
      selectedProducts.map(
        (product) => ({
          name: product.name,
          brand: product.brand,
          category: product.category,
          description: product.description
        })
      );

    const routineRequest = `
Build a personalized beauty routine using only these selected products:

${JSON.stringify(productData)}

Explain the order they should be used in, when they should be used,
and what each product does in the routine.
`;

    messages.push({
      role: "user",
      content: routineRequest
    });

    addMessage(
      "ai",
      "Building your routine..."
    );

    try {
      const response = await fetch(
        workerUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            messages: messages
          })
        }
      );

      const data =
        await response.json();

      const reply =
        data.choices[0]
          .message
          .content;

      chatWindow.innerHTML = "";

      addMessage("ai", reply);

      messages.push({
        role: "assistant",
        content: reply
      });

    } catch (error) {

      chatWindow.innerHTML = "";

      addMessage(
        "ai",
        "Something went wrong while generating your routine."
      );

      console.error(error);
    }
  }
);


// Follow up chat
chatForm.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    const question =
      userInput.value.trim();

    if (question === "") {
      return;
    }

    addMessage(
      "user",
      question
    );

    messages.push({
      role: "user",
      content: question
    });

    userInput.value = "";

    try {
      const response =
        await fetch(
          workerUrl,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              messages: messages
            })
          }
        );

      const data =
        await response.json();

      const reply =
        data.choices[0]
          .message
          .content;

      addMessage(
        "ai",
        reply
      );

      messages.push({
        role: "assistant",
        content: reply
      });

    } catch (error) {

      addMessage(
        "ai",
        "Sorry, I could not get a response right now."
      );

      console.error(error);
    }
  }
);


// Create chat message
function addMessage(type, text) {
  const message =
    document.createElement("div");

  message.classList.add(
    "message",
    type
  );

  message.textContent = text;

  chatWindow.appendChild(
    message
  );

  chatWindow.scrollTop =
    chatWindow.scrollHeight;
}


// Load all products when page starts
loadProducts();