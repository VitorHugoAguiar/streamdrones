function adjustMargin() {
    var body_image = document.querySelector('.background-radial-gradient');
    var bgGlass = document.querySelector('.bg-glass');
    var image = document.querySelector('.adjustable-image');
    var h1Title = document.querySelector('.h1-title'); 
    var registerTop = document.querySelector('.register-top');
    var empty_div = document.querySelector('.empty_div');
    
    var width = window.innerWidth; // Store the window width

    // Check if the window width is less than 991 pixels
    if (width < 991) {
        if (width < 480) {
            registerTop.style.marginTop = '250px';
            body_image.style.marginTop = '-70px';
            body_image.style.maxHeight = '90vh';
            h1Title.style.display = 'none'; 
            empty_div.style.marginBottom = '0';
            image.style.marginTop = '80px'; 
        
        } else {
            body_image.style.marginTop = '-15px';
            body_image.style.maxHeight = '98vh';
            registerTop.style.marginTop = '80px';
            h1Title.style.display = 'block'; 
            empty_div.style.marginBottom = '230px';
            image.style.marginTop = '130px'; 

            if (width < 800) {
                if (window.innerHeight > window.innerWidth) {
                    // Portrait orientation
                    console.log("portrait");
                    h1Title.style.display = 'block';
                } else {
                    // Landscape orientation
                    console.log("landscape");
                    body_image.style.marginTop = '-10px'; 
                    body_image.style.maxHeight = '195vh';
                    registerTop.style.marginTop = '270px';
                    empty_div.style.marginBottom = '0';
                    image.style.marginTop = '100px'; // Adjust the top position of the image
                    h1Title.style.display = 'none';
                }
            }

        }
        bgGlass.style.marginTop = '-120px';
        image.style.maxWidth = '120px';
        
    } else {
        registerTop.style.marginTop = '40px';
        h1Title.style.display = 'block'; // Show the h1 element
        empty_div.style.marginBottom = '150px';
        
        body_image.style.marginTop = '-10px';
        body_image.style.maxHeight = '95vh';
        bgGlass.style.marginTop = '';
        image.style.marginTop = '-10px'; // Reset the top position of the image
        image.style.maxWidth = '200px';

    }
}

// Call the function on initial load
adjustMargin();

// Add event listener for window resize
window.addEventListener('resize', adjustMargin);