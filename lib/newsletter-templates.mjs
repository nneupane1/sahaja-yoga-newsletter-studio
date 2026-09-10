const cdn="https://mcusercontent.com/fc12c592c7906c401ea96e6b5/";
const image=p=>cdn+p;
const photos=[
 ["images/91446137-52d9-a5d2-7636-b520593e5096.jpg","images/e741fee7-cd73-151a-d93c-10f271ca6081.jpg","_compresseds/d6e85fb4-a11e-319e-1e23-96633a788f32.jpg"],
 ["images/b5a5d0ad-7b8d-acfb-a32a-e05139d01498.jpg","images/59d2a7c1-3e78-ff2c-d605-37c6ca3cffab.jpg","images/8d63f0a9-0492-a1f6-b736-97a8d60920a3.jpg"],
 ["_compresseds/6678575e-3b15-09f1-28f4-27049f7ad0a6.jpg","_compresseds/6f578c61-3424-44ff-269c-e06d679f2779.jpg","_compresseds/6c8b8354-0968-b452-8358-2a43c7fc2b76.jpg"],
 ["_compresseds/37dde9c6-1630-f60b-38bb-18bdf1282c1c.jpg","_compresseds/2b090ec9-027d-cf49-7115-a9e9ac3c2cb6.jpg","_compresseds/dfab21e3-ce64-1c00-253f-1ad3b6b207cd.jpg"],
 ["_compresseds/def07e59-6b66-9ed2-db6e-30c902641709.jpg","_compresseds/fcac9c55-f116-7d1d-0b9a-1bf3680bbcce.jpg","_compresseds/dcdbd13c-279b-81a3-a94c-cdb9e72aeba0.jpg"]
];
const reports=[
 ["Die Lange Nacht der Musik","09. Mai 2026 · München","Musik, gemeinsame Meditation und Begegnungen prägten diesen Abend im Zentrum. Wir danken den Künstlern und allen helfenden Händen.","viSGox6yDcQjhDx16"],
 ["Zamanand Straßenfest","20.–21. Juni 2026 · München","Am Meditationsstand konnten Besucher mitten im Trubel innehalten. Danke an alle, die diese Begegnungen möglich gemacht haben.","3YBd5QSD2cMkUAeC8"],
 ["Internationaler Yogatag","21. Juni 2026 · München","Unser Verein war mit einem Info- und Meditationspavillon sowie einem Beitrag auf der Aktionsbühne vertreten.","Z8xKbtnwFjnxVNqm9"],
 ["Internationales Fest","04.–05. Juli 2026 · Aalen","Gespräche und geleitete Meditationen eröffneten den Besuchern einen persönlichen Zugang zur inneren Stille.","FNkMdLnkyJf3RwqY8"],
 ["United Europe Tour","München · Datum vor Versand prüfen","Die Light Route verband Live-Musik und gemeinsame Meditation. Das genaue Veranstaltungsdatum muss vor dem Versand bestätigt werden.","YquBE9w1u7EELgvT7"]
];
const block=(type,data)=>({id:crypto.randomUUID(),type,data});
export function templateBlocks(id="journal") {
 if(id==="invitation")return invitationBlocks();
 const accent=id==="spotlight"?"#7a3d35":id==="digest"?"#16756f":"#175cdf";
 const title=id==="spotlight"?"SY Europe Tour · Musik & innere Stille":id==="digest"?"Sahaja Yoga · Begegnungen & Rückblicke":"Sahaja Yoga · Ein Sommer voller Begegnungen";
 const blocks=[
 block("hero",{eyebrow:"Sahaja Yoga Kultur e.V. · September 2026",title,text:"Gemeinsam erlebt. Voller Vorfreude auf das, was kommt.",pageBackground:id==="spotlight"?"#f1e9e7":id==="digest"?"#eaf1ef":"#eef1f6",surfaceBackground:id==="spotlight"?"#fffdf9":"#ffffff",background:id==="spotlight"?"#452b36":id==="digest"?"#164b49":"#17275d",imageUrl:image("images/7f444944-8ab0-edf8-6e1d-92ad9fe1571e.jpg"),opacity:100}),
 block("heading",{text:"Hallo liebe Interessenten,",size:30,color:"#17213f"}),
 block("text",{text:"wir blicken auf einen Sommer voller Musik, Meditation und Begegnungen zurück. In dieser Ausgabe findet ihr unsere kommenden Veranstaltungen, regelmäßige Meditationsabende und die schönsten Momente seit dem letzten Newsletter.",color:"#46536b"}),
 block("story",{meta:"VORSCHAU · 02. OKTOBER 2026 · MÜNCHEN",title:"The Power of Mental Silence",text:"Ein Abend mit Vortrag, geleiteter Meditation und Musik. Dr. Sergio Elías Hernández und Namastè verbinden ihre Perspektiven auf innere Stille. Alle aktuellen Angaben zur Veranstaltung findet ihr bei der Anmeldung.",imageUrl:image("images/bd52a0f9-2d54-ea02-bb94-5a2945733150.jpg"),alt:"Plakat zur The Power of Mental Silence Tour",layout:id==="spotlight"?"above":"left",url:"https://www.eventbrite.de/e/1997339454074?aff=oddtdtcreator",label:"Kostenloses Ticket reservieren",accent}),
 block("heading",{text:"Wöchentlich zusammen meditieren",size:28,color:accent}),
 block("text",{text:"München · Am Lilienberg 2a\nMontag 19:30 · Italienisch\nDienstag 18:30–20:00 · Englisch, außer in den Schulferien\nDonnerstag 19:30 · Offene Gruppe\nFreitag 19:30 · International\nSamstag 18:30 · Mit Anmeldung\n\nBitte überprüft Zeiten und Anmeldewege vor jedem Versand.",color:"#46536b"}),
 block("button",{label:"Aktuelle Termine & Anmeldung",url:"https://www.meetup.com/Free-Meditation-Yoga-Munich/events/",background:accent,color:"#ffffff"}),
 block("heading",{text:"Unser nächstes Wiedersehen",size:28,color:accent}),
 block("text",{text:"12.–13. September · Zamanand Festival, München\n16.–18. Oktober · Energetika, Grafing\n\nAktuelle Zeiten und Veranstaltungsdetails vor Veröffentlichung ergänzen.",color:"#46536b"}),
 block("divider",{color:"#dde3ee"}),
 block("heading",{text:"Was wir gemeinsam erlebt haben",size:32,color:"#17213f"})
 ];
 reports.forEach((r,i)=>{
  blocks.push(block("story",{meta:r[1],title:r[0],text:r[2],imageUrl:id==="digest"?image(photos[i][0]):"",layout:i%2?"right":"left",accent,url:id==="digest"?"https://photos.app.goo.gl/"+r[3]:"",label:"Gesamtes Fotoalbum"}));
  if(id!=="digest")blocks.push(block("gallery",{imageUrl:image(photos[i][0]),image2:image(photos[i][1]),image3:image(photos[i][2]),imageUrlAlt:r[0]+" · Moment 1",image2Alt:r[0]+" · Moment 2",image3Alt:r[0]+" · Moment 3",url:"https://photos.app.goo.gl/"+r[3],label:"Gesamtes Fotoalbum",background:accent,color:"#ffffff",radius:4}));
  blocks.push(block("divider",{color:"#e2e7ef"}));
 });
 blocks.push(block("heading",{text:"Aktuelles & Lesenswertes",size:28,color:accent}),block("text",{text:"Hier ist Platz für einen ausgewählten Artikel, einen Musikbeitrag oder Neuigkeiten aus unserer Gemeinschaft. Kurze Einleitung ergänzen und zum vollständigen Beitrag verlinken.",color:"#46536b"}),block("button",{label:"Gemeinsam meditieren · We Meditate",url:"https://wemeditate.com/",background:accent,color:"#ffffff"}),block("text",{text:"Mit freundlichen Grüßen & bis bald,\nSahaja Yoga Kultur e.V.",color:"#46536b"}));
 return blocks;
}
export const templates=[
 {id:"invitation",name:"Event Invitation",description:"A focused tour special: two programme cards, booking links and a video teaser. Plum, rose and warm white.",accent:"#835256",campaignName:"SY Europe Tour · Gemeinsam in München"},
 {id:"journal",name:"Community Journal",description:"An editorial issue with five retrospective stories, three-photo galleries and individual album links.",accent:"#175cdf",campaignName:"Sahaja Yoga · Ein Sommer voller Begegnungen"},
 {id:"spotlight",name:"Tour Spotlight",description:"A generous event invitation followed by the community journal. Burgundy, warm gold and ample white space.",accent:"#7a3d35",campaignName:"SY Europe Tour · Musik & innere Stille"},
 {id:"digest",name:"Quiet Digest",description:"A shorter reading rhythm with alternating image-and-text stories. Deep teal with compact event details.",accent:"#16756f",campaignName:"Sahaja Yoga · Begegnungen & Rückblicke"}
];
export function templateCatalog(){return templates.map(t=>({...t,blocks:templateBlocks(t.id)}));}


function invitationBlocks(){
 const accent="#835256",booking="https://www.eventbrite.de/e/sahaja-yoga-eu-tour-in-munchen-musik-meditation-innere-ruhe-tickets-1993488682312";
 return [
  block("hero",{eyebrow:"UNITED EUROPE TOUR · SONDERAUSGABE",title:"Musik verbindet.\nStille berührt.",text:"Ein gemeinsamer Tag voller Musik, Begegnung und Meditation in München.",background:"#352637",pageBackground:"#f2edf0",surfaceBackground:"#fffcf9",imageUrl:image("images/00a6fad6-8cdd-e43a-c0f9-90dbb1793129.jpg"),alt:"United Europe Tour · München",radius:0}),
  block("heading",{text:"Hallo liebe Interessenten,",size:30,color:"#352637"}),
  block("text",{text:"die United Europe Tour bringt Generationen und Kulturen zusammen. In München laden Musik und geleitete Meditationen dazu ein, innezuhalten und einander zu begegnen. Hier findet ihr das Nachmittags- und Abendprogramm auf einen Blick.",color:"#554d5d"}),
  block("story",{meta:"NACHMITTAG · DATUM VOR VERSAND BESTÄTIGEN",title:"Musik im Dianatempel",text:"15:00–18:00 Uhr\nHofgartenstraße 6, 80539 München\n\nLive-Musik und eine Einführung in die Meditation unter freiem Himmel. Der Eintritt ist frei. Das Datum dieser historischen Vorlage ist widersprüchlich und muss vor Versand bestätigt werden.",imageUrl:image("images/2844237b-73c4-2aed-6f07-717a947efc46.jpg"),alt:"Veranstaltungsplakat der United Europe Tour",layout:"right",label:"Kostenlosen Platz reservieren",url:booking,accent}),
  block("divider",{color:"#ded1d7"}),
  block("story",{meta:"ABEND · DATUM VOR VERSAND BESTÄTIGEN",title:"Ein Abend der inneren Ruhe",text:"19:00–21:00 Uhr\nSahaja Yoga Zentrum · Am Lilienberg 2a\n81669 München\n\nCellomusik und gemeinsame Meditation schaffen Raum für einen ruhigen Ausklang. Die Tourvorlage nennt Hanna Shcherbyna und Dhara Ersan als mitwirkende Künstlerinnen. Programm und Besetzung bitte für diese Ausgabe bestätigen.",imageUrl:image("images/4ae683b7-b617-4817-24f8-ced1daccdbb2.jpg"),alt:"Musikprogramm der United Europe Tour",layout:"above",label:"Zum kostenlosen Abendprogramm",url:booking,accent}),
  block("story",{meta:"EIN VORGESCHMACK",title:"Einblicke in die Tour",text:"Ein kurzer Film aus Völkermarkt lässt die Atmosphäre der gemeinsamen Reise lebendig werden.",imageUrl:image("video_thumbnails_new/b27e4243012c2edb5499d188c831ccb5.png"),alt:"Vorschaubild zum United Europe Tour Video",layout:"left",label:"Tourfilm auf YouTube ansehen",url:"https://youtu.be/vdt7tNvNiIU",accent}),
  block("heading",{text:"Auch nach der Tour verbunden",size:29,color:"#352637"}),
  block("text",{text:"Unsere regelmäßigen Meditationsabende in München bieten Raum für die gemeinsame Praxis. Bitte ergänzt für diese Ausgabe die bestätigten Sprachen, Termine und Anmeldewege.",color:"#554d5d"}),
  block("button",{label:"Aktuelle Meditationsabende",url:"https://www.meetup.com/Free-Meditation-Yoga-Munich/events/",background:accent,color:"#ffffff"}),
  block("story",{meta:"VORSCHAU · 12.–13. SEPTEMBER 2026",title:"Wiedersehen beim Zamanand Festival",text:"Unser Info- und Meditationspavillon lädt zum Innehalten ein. Die Zeiten und den Standort vor dem Versand für die aktuelle Veranstaltung prüfen.",imageUrl:image("images/2de2658a-cb1d-cca8-eadc-3fcfd9d71275.jpg"),alt:"Zamanand Festival in München",layout:"above",label:"Festivalinformationen",url:"https://www.zamanand.de/",accent}),
  block("heading",{text:"Aktuelles aus unserer Gemeinschaft",size:29,color:"#352637"}),
  block("text",{text:"Hier könnt ihr einen aktuellen Bericht mit einer kurzen persönlichen Einleitung ergänzen. Beschreibt in zwei bis drei Sätzen, warum dieser Beitrag für unsere Leser interessant ist.",color:"#554d5d"}),
  block("divider",{color:"#ded1d7"}),
  block("text",{text:"Mit freundlichen Grüßen & bis bald,\nSahaja Yoga Kultur e.V.",color:"#554d5d"})
 ];
}
