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

const ROLE_ID = "1501576591145173184";

const REGISTER_CHANNEL_ID = "1501579466445422652";
const CATEGORY_ID = "1501579361453871255";

/* FARM */
const FARM_CHANNEL_ID = "1501577664341999870";
const FARM_MANAGER_ROLE = "1501776069764845589";
const FARM_BOSS_ROLE = "1501576408663851088";
const FARM_CATEGORY_ID = "1501577320266465290";

/* AUSÊNCIA */
const ABSENCE_CHANNEL_ID = "1501576780027396168";

const registros = new Map();

const perguntas = [
  "Digite seu **ID/Passaporte**",
  "Digite seu **Telefone**",
  "Já participou de alguma facção antes?",
  "Quantas facções já participou?",
  "Quem te recrutou?"
];

client.once("ready", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

/* ================= PAINÉIS ================= */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!painel") {
    if (message.channel.id !== REGISTER_CHANNEL_ID) return;

    const embed = new EmbedBuilder()
      .setTitle("📋 Registro")
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("iniciar_registro")
        .setLabel("Iniciar")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }

  if (message.content === "!farm") {
    if (message.channel.id !== FARM_CHANNEL_ID) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("abrir_farm")
        .setLabel("Abrir Farm")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({
      content: "Painel Farm",
      components: [row]
    });
  }

  if (message.content === "!ausencia") {
    if (message.channel.id !== ABSENCE_CHANNEL_ID) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("abrir_ausencia")
        .setLabel("Ausência")
        .setStyle(ButtonStyle.Danger)
    );

    await message.channel.send({ components: [row] });
  }
});

/* ================= INTERAÇÕES ================= */
client.on("interactionCreate", async (interaction) => {

  /* ============ REGISTRO INICIO ============ */
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

    registros.set(canal.id, {
      userId: interaction.user.id,
      etapa: 0,
      respostas: []
    });

    await interaction.reply({ content: `Canal criado: ${canal}`, flags: 64 });
    await canal.send(`${interaction.user} ${perguntas[0]}`);
  }

  /* ============ FARM ============ */
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

    await canal.send({ components: [row] });
  }

  /* ============ METAS ============ */
  if (interaction.customId === "ver_metas") {
    const embed = new EmbedBuilder()
      .setTitle("Meta Farm")
      .addFields(
        { name: "Frequência", value: "Semanal" },
        { name: "Quantidade", value: "450" },
        { name: "Tipo", value: "Farinha de Trigo" }
      )
      .setColor("Blue");

    await interaction.reply({ embeds: [embed], flags: 64 });
  }

  if (interaction.customId === "fechar_farm") {
    await interaction.reply({ content: "Fechando..." });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
  }

  /* ============ AUSÊNCIA ============ */
  if (interaction.customId === "abrir_ausencia") {
    const modal = new ModalBuilder()
      .setCustomId("form_ausencia")
      .setTitle("Ausência");

    const motivo = new TextInputBuilder()
      .setCustomId("motivo")
      .setLabel("Motivo")
      .setStyle(TextInputStyle.Paragraph);

    const dias = new TextInputBuilder()
      .setCustomId("dias")
      .setLabel("Dias")
      .setStyle(TextInputStyle.Short);

    modal.addComponents(
      new ActionRowBuilder().addComponents(motivo),
      new ActionRowBuilder().addComponents(dias)
    );

    await interaction.showModal(modal);
  }

  if (interaction.customId === "form_ausencia") {
    const motivo = interaction.fields.getTextInputValue("motivo");
    const dias = interaction.fields.getTextInputValue("dias");

    const log = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("🚫 Ausência")
      .addFields(
        { name: "Usuário", value: interaction.user.tag },
        { name: "Motivo", value: motivo },
        { name: "Dias", value: dias }
      )
      .setColor("Red");

    await log.send({ embeds: [embed] });

    await interaction.reply({ content: "Enviado!" });
  }

  /* ============ APROVAR / RECUSAR ============ */
  if (interaction.customId.startsWith("aprovar_")) {
    const userId = interaction.customId.split("_")[1];

    const member = await interaction.guild.members.fetch(userId);
    await member.roles.add(ROLE_ID);

    await interaction.reply({ content: "✔ Aprovado!", flags: 64 });
  }

  if (interaction.customId.startsWith("recusar_")) {
    await interaction.reply({ content: "❌ Recusado!", flags: 64 });
  }

  /* ============ FINAL REGISTRO ============ */
  if (interaction.isButton()) return;
});

/* ============ CHAT REGISTRO ============ */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const registro = registros.get(message.channel.id);
  if (!registro) return;

  registro.respostas.push(message.content);
  registro.etapa++;

  if (registro.etapa < perguntas.length) {
    return message.channel.send(perguntas[registro.etapa]);
  }

  const guild = message.guild;

  const staff = guild.channels.cache.get(STAFF_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle("📋 Registro Pendente")
    .setColor("Yellow")
    .addFields(
      { name: "Usuário", value: `<@${registro.userId}>` },
      { name: "Respostas", value: registro.respostas.join("\n") }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`aprovar_${registro.userId}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`recusar_${registro.userId}`)
      .setLabel("Recusar")
      .setStyle(ButtonStyle.Danger)
  );

  await staff.send({ embeds: [embed], components: [row] });

  await message.channel.send("📨 Enviado para staff...");
  setTimeout(() => message.channel.delete().catch(() => {}), 5000);

  registros.delete(message.channel.id);
});

client.login(process.env.TOKEN);