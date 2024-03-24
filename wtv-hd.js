/*
  WebTV HD compatibility script - See https://github.com/SKCro/WebTV-HD for details.
  Add this script to every page on your site to make it more compatible with WebTV HD.
  /!\ Place the script at the very end of the body so everything can load in beforehand, otherwise you'll probably get errors.
  This will send metadata to WTV-HD once verified - currently, just the page name and display tag.
  Note that this script redefines alert() in a way that doesn't block script execution while the message is shown, so keep that in mind.
  Yes, I know, the code is a mess. I'm sorry.
*/

//Verify if the iframe is actually WebTV HD before sending metadata - yes, I know this security method is lame. I'll probably tighten it up later, but for now, it's good for testing.
//I should probably limit the message source to the current instance of WebTV HD, which is at https://skcro.github.io/WebTV-HD.
if(window.self!==window.top){//If the current window isn't the top one...
  parent.postMessage({type:'QueryForWebTVHD'},'*');//Post a message querying for WebTV HD...
  addEventListener('message',doInit);//Then once that message is recieved, start other functions
  function doInit(e){
    if(e.data&&e.data.type==='Yes, I am the real SKCro!'){
      init();
      removeEventListener('message',doInit);
    }
  }
  function init(){
    //Alert-related functionality
    alert=function(text){parent.postMessage({type:'jsalert',text:text},'*');}//Redefine alert to use WebTV-style alert dialogs - it still works the same, but doesn't block execution of scripts
    function showAlert(text){parent.postMessage({type:'alert',text:text},'*');}//Add support for service-style alert dialogs that use the WebTV logo instead
    window.tempAction='';//Temporary place to store the action while it's queued
    function showCustomAlert(text,image,label,action){//Example usage: showCustomAlert(`<h1>beans</h1>`,'https://www.recipetineats.com/wp-content/uploads/2014/05/Homemade-Heinz-Baked-Beans_0-SQ.jpg','beans','none');
      window.tempAction=action;
      try{
        if(text&&image&&label&&action){
          if(text!==null&&text!=='none'){parent.postMessage({type:'alertText',text:text},'*');}
          if(image!==null&&image!=='none'){parent.postMessage({type:'alertImage',image:image},'*');}
          if(label!==null&&label!=='none'){parent.postMessage({type:'alertButtonText',label:label},'*');}
          if(action!==null&&action!=='none'){parent.postMessage({type:'alertButtonAction'},'*');}
          parent.postMessage({type:'showCustomAlert'},'*');
        }else{showAlert(`Usage: showCustomAlert('Alert text', 'Image URL', 'Button Label', 'Button Action Code'); Use 'none' if you don't want to specify part of a dialog.`);}
      }catch(error){
        parent.postMessage({type:'alertSound',sound:`audio/doh.mp3`},'*');
        showCustomAlert(`D'oh! ${error} | See console for details.`, 'images/JSAlert.svg', 'Dang it...', 'none');
        console.log(error);
      }
    }
    addEventListener('message',function(e){if(e.data&&e.data.type==='doAlertAction'){eval(tempAction);tempAction='';}});
    window.linkHandler=function(url){location.href=url;}//Useful for buttons or other clickable things that don't support href

    //Page name updater - monitors page title and reports any changes back to WTV-HD
    const observer=new MutationObserver(updatePageName);//Set up a new observer to, well, observe page name updates
    function updatePageName(){parent.postMessage({title:document.title},'*');}//Send a message to the parent iframe with the current document title
    function trackName(){
      updatePageName();//Send page name once updates are detected
      observer.disconnect();//Disconnect any existing observers to prevent duplicates
      observer.observe(document.querySelector('title'),{subtree:true,characterData:true,childList:true});//Tell the observer to look for changes in the page name
    }trackName();//Kick off the page name updater

    /* <display> tag reimplementation
      HOW TO USE:
      Add a <meta name=display> tag to the header of your page. Set the content to one or more of the following:
      noScroll - prevent scrolling the page (although this is probably better achieved with CSS)
      noStatus - hide the status bar (which also prevents opening the options menu, so use with care)
      noMusic - disable the user's background music (use if your site has content that the background music might interfere with, like videos)
      For example: <meta name=display content="noMusic noStatus">
    */
    const displayTag=document.querySelector('meta[name="display"]');//Get the display tag from the document, if any
    if(displayTag){//If the display tag exists...
      const displayOptions=displayTag.getAttribute('content').split(' ');//Get its content and post messages if certain attributes are found
      if(displayOptions.includes('noScroll')){console.debug('Scrolling disabled - noScroll is set in the display tag.');document.querySelector('html').style.overflow='hidden';document.body.style.overflow='hidden';}
      if(displayOptions.includes('noStatus')){parent.postMessage({type:'display',attribute:'noStatus'},'*');}
      if(displayOptions.includes('noMusic')){parent.postMessage({type:'display',attribute:'noMusic'},'*');}
    }else{parent.postMessage({type:'display',attribute:'none'},'*');}//If there isn't any display tag, just post none so WTV-HD knows that the page doesn't have any special properties

    /* <bgsound> tag reimplementation
      HOW TO USE:
      Add a <meta name=bgsound> tag to the header of your page. Set the content to the absolute source URL of a music file, preferably an MP3 (since modern browsers don't do MIDI).
      If the music shouldn't loop (it does by default), add ";"
      For example: <meta name=bgsound content="https://example.com/bgsound.mp3">
    */
    const bgsound=document.querySelector('meta[name="bgsound"]');//Get the bgsound tag from the document, if any
    if(bgsound){//If the bgsound tag exists...
      const bgsoundSrc=bgsound.getAttribute('content');//Get its content...
      if(bgsoundSrc){parent.postMessage({type:'bgsound',source:bgsoundSrc},'*');}//...and post a message if a source is found
    }else{parent.postMessage({type:'bgmusic',source:'none'},'*');}//If there isn't any display tag, just post none so WTV-HD knows that the page doesn't have any bgsound

    //Message handlers
    addEventListener('message',function(e){//Listen for messages from WebTV HD
      if(e.data){//Check if the message contains data
        if(e.data.type==='find'&&e.data.term){//If the message is "find", and we have a search term...
          const term=find(e.data.term);//...look for the term on the page and highlight it if we found it
          if(term){//If the term was found...
            parent.postMessage({type:'matchFound'},'*');//Tell WTV-HD that we found the term (which closes the find panel)
          }else{parent.postMessage({type:'noMatchFound'},'*');}//Or, if we didn't find it, tell WTV-HD just that (which brings up an error message)
        }

        else if(e.data.type==='print'){print();}//If the message is "print", prompt the user to print the page

        //else if(e.data.type==='resetSelectionBox'){resetSelectionBox();}//If the message is "resetSelectionBox", do just that :P - currently commented out because the selectionbox isn't implemented yet

        else if(e.data.type==='toggleSidebar'){//If the message is "toggleSidebar"...
          const sidebar=document.querySelector('.sidebar');//Locate the sidebar or navigation bar
          const nav=document.querySelector('.side-nav');
          function show(e){//Function to show sidebar
            playSound('panelUp');
            e.classList.remove('hiding','hide');
            e.classList.add('show');
            resetSelectionBox();
          }
          function hide(e){//Function to hide sidebar
            playSound('panelDown');
            e.classList.remove('showing','show');
            e.classList.add('hide');
            resetSelectionBox();
          }
          if(sidebar){//If there's a sidebar, show or hide it
            if(sidebar.classList.contains('show')||sidebar.classList.contains('showing')){hide(sidebar);}else{show(sidebar);}
          }else if(nav){//If there's a side nav, show or hide it
            if(nav.classList.contains('show')||nav.classList.contains('showing')){hide(nav);}else{show(nav);}
          }else{playSound('bonkSound');}//If there's neither, just play the bonk sound effect
        }
      }
    });
  }
};