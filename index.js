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
  PermissionsBitField
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
const ROLE_ID = "1501576591145173184";
const REGISTER_CHANNEL_ID = "1501579466445422652";
const CATEGORY_ID = "1501579361453871255";

/* FARM CONFIG */
const FARM_CHANNEL_ID = "1501577664341999870";
const FARM_MANAGER_ROLE = "1501776069764845589";
const FARM_BOSS_ROLE = "1501576408663851088";
const FARM_CATEGORY_ID = "1501577320266465290";
/* ========================================== */

const registros = new Map();
const farms = new Map();

const perguntas = [
  "Digite seu **ID/Passaporte**\nExemplo: `937`\n(Apenas números)",
  "Digite seu **Telefone**\nExemplo: `333-333`",
  "Já participou de alguma facção antes?",
  "Quantas facções já participou?",
  "Quem te recrutou?"
];

client.once("clientReady", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

/* ================= REGISTRO ================= */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!painel") {
    if (message.channel.id !== REGISTER_CHANNEL_ID) return;

    const embed = new EmbedBuilder()
      .setTitle("📋 Registro Facção")
      .setDescription("Clique no botão abaixo para iniciar seu registro.")
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("iniciar_registro")
        .setLabel("Iniciar Registro")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }

  const registro = registros.get(message.author.id);

  if (registro && message.channel.id === registro.canalId) {
    if (registro.etapa === 0 && !/^\d+$/.test(message.content))
      return message.channel.send("❌ Apenas números. Ex: 937");

    if (registro.etapa === 1 && !/^\d{3}-\d{3}$/.test(message.content))
      return message.channel.send("❌ Use: 333-333");

    registro.respostas.push(message.content);
    registro.etapa++;

    if (registro.etapa < perguntas.length) {
      return message.channel.send(perguntas[registro.etapa]);
    }

    registros.delete(message.author.id);

    const staffChannel = message.guild.channels.cache.get(STAFF_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("📨 Novo Registro")
      .setColor("Yellow")
      .addFields(
        { name: "Usuário", value: message.author.tag },
        { name: "ID", value: registro.respostas[0] },
        { name: "Telefone", value: registro.respostas[1] },
        { name: "Facção anterior", value: registro.respostas[2] },
        { name: "Quantidade", value: registro.respostas[3] },
        { name: "Recrutador", value: registro.respostas[4] }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`aprovar_${message.author.id}`)
        .setLabel("✅ Aprovar")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`recusar_${message.author.id}`)
        .setLabel("❌ Recusar")
        .setStyle(ButtonStyle.Danger)
    );

    await staffChannel.send({ embeds: [embed], components: [row] });

    await message.channel.send("Registro enviado. Canal será apagado em 10s");

    setTimeout(() => message.channel.delete().catch(() => {}), 10000);
  }

  /* ================= FARM PAINEL ================= */
  if (message.content === "!farm") {
    if (message.channel.id !== FARM_CHANNEL_ID) return;

    const embed = new EmbedBuilder()
      .setTitle("Tropa da Leste | Painel de Farm")
      .setDescription("Clique para abrir sua pasta de farm.")
      .setThumbnail(message.guild.iconURL({ dynamic: true, size: 512 }))
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
});

/* ================= INTERACTIONS ================= */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  /* REGISTRO */
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

  /* ================= FARM (CORRIGIDO) ================= */
  if (interaction.customId === "abrir_farm") {
    const guild = interaction.guild;

    const canal = await guild.channels.create({
      name: `farm-${interaction.user.username}`, // ✔ CORRIGIDO AQUI
      type: ChannelType.GuildText,
      parent: FARM_CATEGORY_ID, // ✔ categoria certa
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
        .setLabel("Fechar Pasta")
        .setEmoji("❌")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("ver_metas")
        .setLabel("Ver Metas")
        .setEmoji("👁")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ content: `Criado: ${canal}`, flags: 64 });

    await canal.send({
      content: `${interaction.user} sua pasta de farm foi criada.`,
      components: [row]
    });
  }

  /* FECHAR FARM */
  if (interaction.customId === "fechar_farm") {
    await interaction.reply({ content: "Fechando...", flags: 64 });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
  }

  /* VER METAS */
  if (interaction.customId === "ver_metas") {
    const embed = new EmbedBuilder()
      .setTitle("Tropa da Leste | Meta de Farm")
      .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 512 }))
      .setColor("Blue")
      .addFields(
        { name: "Frequência", value: "Semanal" },
        { name: "Descrição", value: "Entregar em mãos para Braga" },
        { name: "Quantidade", value: "450" },
        { name: "Tipo", value: "Farinha de Trigo" }
      );

    await interaction.reply({ embeds: [embed], flags: 64 });
  }
});

client.login(process.env.TOKEN);