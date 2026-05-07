require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

/* ================= CONFIG ================= */
const STAFF_CHANNEL_ID = "1501578418834112554";
const LOG_CHANNEL_ID = "1501628297056882820";
const RESULT_CHANNEL_ID = "1501590299003064362";

const ROLE_ID = "1501576591145173184"; // ✔ CARGO REGISTRO

const REGISTER_CHANNEL_ID = "1501579466445422652";
const CATEGORY_ID = "1501579361453871255";

/* FARM CONFIG */
const FARM_CHANNEL_ID = "1501577664341999870";
const FARM_MANAGER_ROLE = "1501776069764845589";
const FARM_BOSS_ROLE = "1501576408663851088";
const FARM_CATEGORY_ID = "1501577320266465290";

/* AUSÊNCIA */
const ABSENCE_CHANNEL_ID = "1501576780027396168";
const ABSENCE_LOG_CHANNEL_ID = "1501781507235119135"; // ✔ FIX FINAL
/* ========================================== */

const registros = new Map();

const perguntas = [
  "Digite seu **ID/Passaporte**\nExemplo: `937`",
  "Digite seu **Telefone**\nExemplo: `333-333`",
  "Já participou de alguma facção antes?",
  "Quantas facções já participou?",
  "Quem te recrutou?"
];

client.once("clientReady", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

/* ================= MENSSAGENS ================= */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  /* PAINEL REGISTRO */
  if (message.content === "!painel") {
    if (message.channel.id !== REGISTER_CHANNEL_ID) return;

    const embed = new EmbedBuilder()
      .setTitle("📋 Registro Facção")
      .setDescription("Clique para iniciar registro.")
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("iniciar_registro")
        .setLabel("Iniciar Registro")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }

  /* FARM PAINEL */
  if (message.content === "!farm") {
    if (message.channel.id !== FARM_CHANNEL_ID) return;

    const embed = new EmbedBuilder()
      .setTitle("Tropa da Leste | Farm")
      .setDescription("Abra sua pasta de farm.")
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("abrir_farm")
        .setLabel("Abrir Pasta")
        .setEmoji("📁")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }

  /* AUSÊNCIA PAINEL */
  if (message.content === "!ausencia") {
    if (message.channel.id !== ABSENCE_CHANNEL_ID) return;

    const embed = new EmbedBuilder()
      .setTitle("🚫 Ausência")
      .setDescription("Clique abaixo para abrir formulário.")
      .setColor("Red");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("abrir_ausencia")
        .setLabel("Ausência")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* ================= INTERAÇÕES ================= */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  /* ================= REGISTRO ================= */
  if (interaction.customId === "iniciar_registro") {
    const guild = interaction.guild;

    const canal = await guild.channels.create({
      name: `registro-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    registros.set(interaction.user.id, {
      etapa: 0,
      respostas: [],
      canalId: canal.id
    });

    await interaction.reply({ content: `Canal criado: ${canal}`, flags: 64 });
    await canal.send(`${interaction.user}\n${perguntas[0]}`);
  }

  /* ================= APROVAR REGISTRO ================= */
  if (interaction.customId.startsWith("aprovar_")) {
    const userId = interaction.customId.split("_")[1];

    try {
      const member = await interaction.guild.members.fetch(userId);

      await member.roles.add(ROLE_ID); // ✔ CARGO AUTOMÁTICO

      const embed = new EmbedBuilder()
        .setTitle("Registro Aprovado")
        .setColor("Green")
        .setDescription(`${member} foi aprovado.`);

      const result = interaction.guild.channels.cache.get(RESULT_CHANNEL_ID);
      if (result) result.send({ embeds: [embed] });

      await interaction.reply({ content: "Aprovado com sucesso!", flags: 64 });
    } catch (err) {
      console.log(err);
    }
  }

  /* ================= FARM ================= */
  if (interaction.customId === "abrir_farm") {
    const guild = interaction.guild;

    const canal = await guild.channels.create({
      name: `farm-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: FARM_CATEGORY_ID,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        },
        { id: FARM_MANAGER_ROLE, allow: [PermissionsBitField.Flags.ViewChannel] },
        { id: FARM_BOSS_ROLE, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("fechar_farm")
        .setLabel("Fechar")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("ver_metas")
        .setLabel("Metas")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ content: `Criado: ${canal}`, flags: 64 });

    await canal.send({
      content: `${interaction.user} pasta criada.`,
      components: [row]
    });
  }

  /* ================= AUSÊNCIA ================= */
  if (interaction.customId === "abrir_ausencia") {
    const modal = new ModalBuilder()
      .setCustomId("form_ausencia")
      .setTitle("Formulário de Ausência");

    const motivo = new TextInputBuilder()
      .setCustomId("motivo")
      .setLabel("Motivo")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const dias = new TextInputBuilder()
      .setCustomId("dias")
      .setLabel("Dias")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(motivo),
      new ActionRowBuilder().addComponents(dias)
    );

    await interaction.showModal(modal);
  }

  /* ================= ENVIO AUSÊNCIA ================= */
  if (interaction.type === InteractionType.ModalSubmit) {
    if (interaction.customId === "form_ausencia") {
      const motivo = interaction.fields.getTextInputValue("motivo");
      const dias = interaction.fields.getTextInputValue("dias");

      const log = interaction.guild.channels.cache.get(ABSENCE_LOG_CHANNEL_ID);

      const embed = new EmbedBuilder()
        .setTitle("Nova Ausência")
        .setColor("Red")
        .addFields(
          { name: "Usuário", value: interaction.user.tag },
          { name: "Motivo", value: motivo },
          { name: "Dias", value: dias }
        );

      if (log) await log.send({ embeds: [embed] });

      await interaction.reply({ content: "Enviado!", flags: 64 });
    }
  }
});

client.login(process.env.TOKEN);