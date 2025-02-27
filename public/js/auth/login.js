function adjustMargin() {
    var body_image = document.querySelector('.background-radial-gradient');
    var image = document.querySelector('.adjustable-image');
    var empty_div = document.querySelector('.empty_div');
    var registerTop = document.querySelector('.register-top');
    var h1Title = document.querySelector('.h1-title'); 

    var width = window.innerWidth; // Store the window width

    // Check if the window width is less than 991 pixels
    if (width < 991) {
        h1Title.style.display = 'block'; 
        // Further check if the window width is less than 480 pixels
        if (width < 480) {
            body_image.style.marginTop = '-50px';
            body_image.style.maxHeight = '88vh';
            registerTop.style.marginTop = '-60px';
            empty_div.style.marginBottom = '230px';
            image.style.marginTop = '120px'; // Adjust the top position of the image
        } else {
            // Apply styles for window width between 480 and 991 pixels
            body_image.style.marginTop = '0';
            body_image.style.maxHeight = '96vh';
            registerTop.style.marginTop = '-70px';
            empty_div.style.marginBottom = '150px';
            image.style.marginTop = '50px'; // Adjust the top position of the image
            if (width < 800) {
                if (window.innerHeight > window.innerWidth) {
                    // Portrait orientation
                    console.log("portrait");
                    h1Title.style.display = 'block'; 
                } else {
                    // Landscape orientation
                    console.log("landscape");
                    body_image.style.marginTop = '200px'; 
                    body_image.style.maxHeight = '150vh';
                    registerTop.style.marginTop = '-80px';
                    empty_div.style.marginBottom = '250px';
                    image.style.marginTop = '110px'; // Adjust the top position of the image
                    h1Title.style.display = 'none';
                }
            }
        }
    
        // Common style for window width less than 991 pixels
        image.style.maxWidth = '150px'; 
    } else {
        // Apply styles for window width of 991 pixels and above
        registerTop.style.marginTop = '0';
        body_image.style.marginTop = '10px';
        image.style.marginTop = ''; // Reset the top position of the image
        empty_div.style.marginBottom = '150px';
        h1Title.style.display = 'block'; 
    }
}

// Call the function on initial load
adjustMargin();

// Add event listener for window resize
window.addEventListener('resize', adjustMargin);