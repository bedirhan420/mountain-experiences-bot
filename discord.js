require("dotenv").config();
const { Client, Interaction, EmbedBuilder,ButtonBuilder, ButtonStyle,ActionRowBuilder } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const {fetchCitiesData,fetchData,fetchCitiesCountData} = require("./api");

var choices = [];
var data = [];

const client = new Client({
  intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"],
});

client.once("ready", async () => {
  console.log("The bot is online");
  choices = await fetchCitiesData();
  data = await fetchData();
  const checkCity = new SlashCommandBuilder()
    .setName("check")
    .setDescription("Input a city.")
    .addStringOption((option) =>
      option
        .setName("city")
        .setDescription("Enter city")
        .setRequired(true)
        .setAutocomplete(true)
    );

  client.guilds.cache.forEach((guild) => {
    guild.commands
      .set([checkCity.toJSON()])
      .then(() => console.log("Slash command registered"))
      .catch(console.error);
  });
});

client.on("interactionCreate", async (interaction) => {
  try {
    const { commandName, options } = interaction;
    if (!interaction.isCommand() && !interaction.isAutocomplete()) return;

    if (interaction.isAutocomplete()) {
      if (commandName === "check") {
        const focusedOption = options.getFocused();

        const filtered = choices.filter((choice) => {
          const normalizedChoice = choice.trim().toLowerCase();
          const normalizedFocusedOption = focusedOption.trim().toLowerCase();
          return normalizedChoice.startsWith(normalizedFocusedOption);
        });

        const responseChoices = filtered
          .slice(0, 25) 
          .map((choice) => ({ name: choice, value: choice }));

        await interaction.respond(responseChoices);
      }
    }
    else if(interaction.isCommand()){
      if (interaction.commandName === "check") {
        await handlerCheckCity(interaction);
      }
    }


  } catch (error) {
    console.log(error);
  }
});



const handlerCheckCity = async (interaction) => {
  const city = interaction.options.getString("city");
  await interaction.deferReply();

  const response = await fetch(`http://localhost:${process.env.PORT}/update-count/${city}`, {
    method: 'PUT',
  });

  const referal_links = await getReferalLink(city);
  if (referal_links.length === 0) {
    await interaction.editReply({
      content: `Sorry, no referral links found for ${city}.`,
      ephemeral: true,
    });
    return;
  }

  const totalPages = Math.ceil(referal_links.length / 10); 
  let currentPage = 1;
  let pageLinks = referal_links.slice(0, 10);

  const embed = new EmbedBuilder()
    .setColor("#0099ff") 
    .setTitle(`Referral Links for ${city} (Page ${currentPage}/${totalPages})`)
    .setTimestamp()
    .setDescription(formatDescription(pageLinks));

  const row = createActionRow(currentPage, totalPages);
  
  const message = await interaction.editReply({ embeds: [embed], components: [row] });

  const filter = (buttonInteraction) => buttonInteraction.user.id === interaction.user.id;
  const collector = message.createMessageComponentCollector({ filter, time: 900000 }); // 15 minutes

  collector.on("collect", async (buttonInteraction) => {
    if (buttonInteraction.customId === "prev_page" && currentPage > 1) {
      currentPage--;
    } else if (buttonInteraction.customId === "next_page" && currentPage < totalPages) {
      currentPage++;
    }

    pageLinks = referal_links.slice((currentPage - 1) * 10, currentPage * 10);
    embed.setTitle(`Referral Links for ${city} (Page ${currentPage}/${totalPages})`)
        .setDescription(formatDescription(pageLinks));

    const updatedRow = createActionRow(currentPage, totalPages);

    await buttonInteraction.update({ embeds: [embed], components: [updatedRow] });
    collector.resetTimer(); // Reset the timer every time the user interacts
  });
};

function formatDescription(links) {
  return links.map(link => `[${link.item_name[0]}](${link.link})\n\n`).join('');
}

function createActionRow(currentPage, totalPages) {
  const prevButton = new ButtonBuilder()
    .setLabel("⬅️ Previous ")
    .setCustomId("prev_page")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage === 1);

  const nextButton = new ButtonBuilder()
    .setLabel("Next ➡️")
    .setCustomId("next_page")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage === totalPages);

  const pageButton = new ButtonBuilder()
    .setLabel(`Page ${currentPage}/${totalPages}`)
    .setCustomId("current_page")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  return new ActionRowBuilder().addComponents(prevButton, pageButton, nextButton);
}


const getReferalLink = async (city) => {
  var links=[];
  data.forEach((item)=>{
    if (item.city === city) {
      item.referal_links.forEach((link)=>{
        links.push(link)
      })
    }
  })
  return links;
}

client.login(process.env.BOT_TOKEN);
