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
  TextInputStyle
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

/* CONFIG */
const STAFF_CHANNEL_ID = "1501578418834112554";
const LOG_CHANNEL_ID = "1501628297056882820";
const RESULT_CHANNEL_ID = "1501590299003064362";
const ROLE_ID = "1501576591145173184";
const REGISTER_CHANNEL_ID = "1501579466445422652";
const CATEGORY_ID = "1501579361453871255";

const FARM_CHANNEL_ID = "1501577664341999870";
const FARM_MANAGER_ROLE = "1501776069764845589";
const FARM_BOSS_ROLE = "1501576408663851088";
const FARM_CATEGORY_ID = "1501577320266465290";

const ABSENCE_CHANNEL_ID = "1501576780027396168";
const ABSENCE_LOG_CHANNEL_ID = "1501781507235119135";

const registros = new Map();

const perguntas = [
  "Digite seu **ID/Passaporte**\nExemplo: `937`",
  "Digite seu **Telefone**\nExemplo: `333-333`",
  "Já participou de alguma facção antes?\nExemplo: `sim` ou `não`",
  "Quantas facções já participou?\nExemplo: `2`",
  "Quem te recrutou?\nExemplo: `Braga`"
];

client.once("ready", () => {
  console.log(`Bot online: ${client.user.tag}`);
});

/* MESSAGE CREATE */
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const registro = registros.get(message.author.id);

  /* RESPOSTAS REGISTRO */
  if (registro && message.channel.id === registro.canalId) {
    registro.respostas.push(message.content);
    registro.etapa++;

    if (registro.etapa < perguntas.length) {
      return message.channel.send(perguntas[registro.etapa]);
    }

    const staff = message.guild.channels.cache.get(STAFF_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("📋 Novo Registro")
      .setColor("Blue")
      .addFields(
        { name: "Usuário", value: `<@${message.author.id}>` },
        { name: "ID", value: registro.respostas[0] },
        { name: "Telefone", value: registro.respostas[1] },
        { name: "Facção antes", value: registro.respostas[2] },
        { name: "Qtd Facções", value: registro.respostas[3] },
        { name: "Recrutador", value: registro.respostas[4] }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`aprovar_${message.author.id}`)
        .setLabel("Aprovar")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`recusar_${message.author.id}`)
        .setLabel("Recusar")
        .setStyle(ButtonStyle.Danger)
    );

    await staff.send({
      embeds: [embed],
      components: [row]
    });

    await message.channel.send("✅ Registro enviado para staff.");
    registros.delete(message.author.id);

    setTimeout(() => {
      message.channel.delete().catch(() => {});
    }, 3000);

    return;
  }

  /* PAINEL REGISTRO */
  if (message.content === "!painel" && message.channel.id === REGISTER_CHANNEL_ID) {
    const embed = new EmbedBuilder()
      .setTitle("📋 Registro Facção")
      .setDescription("Clique abaixo para iniciar seu registro")
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("iniciar_registro")
        .setLabel("Iniciar Registro")
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  /* PAINEL FARM */
  if (message.content === "!farm" && message.channel.id === FARM_CHANNEL_ID) {
    const embed = new EmbedBuilder()
      .setTitle("Tropa da Leste | Farm")
      .setDescription("Clique abaixo para abrir pasta")
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("abrir_farm")
        .setLabel("Abrir Pasta")
        .setEmoji("📁")
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }

  /* PAINEL AUSENCIA */
  if (message.content === "!ausencia" && message.channel.id === ABSENCE_CHANNEL_ID) {
    const embed = new EmbedBuilder()
      .setTitle("🚫 Ausência")
      .setDescription("Clique abaixo para abrir formulário")
      .setColor("Red");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("abrir_ausencia")
        .setLabel("Ausência")
        .setStyle(ButtonStyle.Success)
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* INTERACTIONS */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  /* INICIAR REGISTRO */
  if (interaction.customId === "iniciar_registro") {
    const canal = await interaction.guild.channels.create({
      name: `registro-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
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

    await interaction.reply({
      content: `Canal criado: ${canal}`,
      ephemeral: true
    });

    await canal.send(`${interaction.user}\n${perguntas[0]}`);
  }

  /* APROVAR */
  if (interaction.customId.startsWith("aprovar_")) {
    const userId = interaction.customId.split("_")[1];
    const membro = await interaction.guild.members.fetch(userId);
    const result = interaction.guild.channels.cache.get(RESULT_CHANNEL_ID);

    await membro.roles.add(ROLE_ID);

    await result.send(
      `🎉 | <@${userId}> (${membro.user.username}) seu registro foi **APROVADO**! Bem-vindo à facção.`
    );

    const disabledRow = new ActionRowBuilder().addComponents(
      ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true),
      ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true)
    );

    await interaction.update({
      content: `✅ ${membro.user.tag} aprovado com sucesso.`,
      components: [disabledRow]
    });
  }

  /* RECUSAR */
  if (interaction.customId.startsWith("recusar_")) {
    const userId = interaction.customId.split("_")[1];
    const membro = await interaction.guild.members.fetch(userId);
    const result = interaction.guild.channels.cache.get(RESULT_CHANNEL_ID);

    await result.send(
      `❌ | <@${userId}> (${membro.user.username}) seu registro foi **RECUSADO**. Fale com a liderança para mais informações.`
    );

    const disabledRow = new ActionRowBuilder().addComponents(
      ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true),
      ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true)
    );

    await interaction.update({
      content: `❌ ${membro.user.tag} recusado.`,
      components: [disabledRow]
    });
  }

  /* ABRIR AUSENCIA */
  if (interaction.customId === "abrir_ausencia") {
    const modal = new ModalBuilder()
      .setCustomId("form_ausencia")
      .setTitle("Formulário Ausência");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("motivo")
          .setLabel("Motivo")
          .setStyle(TextInputStyle.Paragraph)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("dias")
          .setLabel("Dias")
          .setStyle(TextInputStyle.Short)
      )
    );

    return interaction.showModal(modal);
  }

  /* ENVIAR AUSENCIA */
  if (interaction.isModalSubmit() && interaction.customId === "form_ausencia") {
    const motivo = interaction.fields.getTextInputValue("motivo");
    const dias = interaction.fields.getTextInputValue("dias");

    const canal = interaction.guild.channels.cache.get(ABSENCE_LOG_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("🚫 Nova Ausência")
      .setColor("Red")
      .addFields(
        { name: "Usuário", value: interaction.user.tag },
        { name: "Motivo", value: motivo },
        { name: "Dias", value: dias }
      );

    await canal.send({ embeds: [embed] });

    return interaction.reply({
      content: "✅ Ausência enviada",
      ephemeral: true
    });
  }

  /* ABRIR FARM */
  if (interaction.customId === "abrir_farm") {
    const canal = await interaction.guild.channels.create({
      name: `farm-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: FARM_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: FARM_MANAGER_ROLE, allow: [PermissionsBitField.Flags.ViewChannel] },
        { id: FARM_BOSS_ROLE, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("fechar_farm")
        .setLabel("Fechar Pasta")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId("ver_metas")
        .setLabel("Ver Metas")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: `Criado: ${canal}`,
      ephemeral: true
    });

    await canal.send({
      content: `${interaction.user}`,
      components: [row]
    });
  }

  if (interaction.customId === "fechar_farm") {
    await interaction.reply({ content: "Fechando...", ephemeral: true });
    setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
  }

  if (interaction.customId === "ver_metas") {
    const embed = new EmbedBuilder()
      .setTitle("📦 Meta Farm")
      .setColor("Blue")
      .addFields(
        { name: "Quantidade", value: "450" },
        { name: "Item", value: "Farinha de Trigo" }
      );

    return interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);