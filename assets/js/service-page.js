(function(){
  var links=document.querySelectorAll('[data-service-contact]');
  links.forEach(function(link){
    link.addEventListener('click',function(){
      try{sessionStorage.setItem('privusServiceInterest',link.getAttribute('data-service-contact'));}catch(e){}
    });
  });
})();
